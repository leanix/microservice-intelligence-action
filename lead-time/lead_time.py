# -*- coding: utf-8 -*-
"""Calculate the lead time for the given microservice.

-- Example:

python3 lead_time.py --service leanix-pathfinder --no-pull  -n3

-- Requires:

- python3
- python3 -m pip install click pype-cli

-- TODOs

- Only tested with leanix-pathfinder under ~/dev/leanix-pathfinder
- Dont count in weekends or lead time outside business hours
- Detecting the first commit of a feature branch is still buggy. In many cases 
  I found the correct first commit and the correct number of commits on 
  feature branch but there are weird cases.
  
  Working:
    python3 lead_time.py --service leanix-pathfinder --no-pull --fixed-release 5.0.128
    python3 lead_time.py --service leanix-pathfinder --no-pull --fixed-release 5.0.118

  Not working: 
    -- Weird. Couldn't find one anymore :?

"""

from os import chdir
import re
import click

import pype

from pype import sh, sho


@click.command(name='lead-time', help=__doc__)
@click.option('--service', '-s', help='Service (e.g. leanix-pathfinder)',
              metavar='SERVICE_NAME', required=True)
@click.option('--n-results', '-n', help='Number of releases to benchmark',
              metavar='NUM', default=10, type=click.INT)
@click.option('--fixed-release', help='Fixed release version to test',
              metavar='SEMVER')
@click.option('--verbose', help='Verbose output', is_flag=True)
@click.option('--no-pull', help='Don\'t pull branch', is_flag=True)
def main(service, n_results, no_pull, fixed_release, verbose):
    """Script's main entry point."""
    src_path = pype.resolve_path('~/dev/' + service)
    try:
        chdir(src_path)
    except FileNotFoundError:
        print('Cannot resolve path ' + src_path)
        exit(1)

    if not no_pull:
        sh('git checkout master && git pull')

    if fixed_release:
        # Allows to calculate lead times for a specific release for debugging
        sem_ver = fixed_release.split(r'.')
        sem_ver_to_tag = sem_ver[0] + '.' + sem_ver[1] + '.' + str(
            int(sem_ver[2]) - 1)
        __calculate_lead_time(fixed_release, sem_ver_to_tag, verbose)
        exit(0)

    rel_tags = __git('tag --list "*.*.*" --sort=-creatordate --ignore-case')
    total_processed = 0
    for i, _ in enumerate(rel_tags):
        if i + 1 == len(rel_tags):  # End of releases
            continue

        from_tag = rel_tags[i]
        to_tag = rel_tags[i + 1]
        __calculate_lead_time(from_tag, to_tag, verbose)

        total_processed += 1
        if total_processed == n_results:
            break


def __calculate_lead_time(from_tag, to_tag, verbose):
    log_filter = ' '.join([
        'log',
        '--grep="Bump snapshot version"',
        '--grep="Update translations"',
        '--invert-grep',
        '--regexp-ignore-case'
    ])
    hashes = [  # Hashes for all commits between tags
        line.split(' ') for line in __git(log_filter
            + r' --format=format:"%H %P" '
            + f'{to_tag}..{from_tag}'
            )
    ]
    [__verbose(h, verbose) for h in __git(log_filter
        + r' --format=format:"%H %P %s %ae" '
        + f'{to_tag}..{from_tag}')]
    deploy_epoch = __commit_date(hashes[0][0])
    pr_merge = [
        h.split(' ') for h in __git(
            f'log --format=format:%H --grep="Merge pull request" --merges {to_tag}..{from_tag}')
    ]

    if len(pr_merge) == 0:
        return

    for pr in pr_merge:
        __calc_lead(pr, hashes, deploy_epoch, from_tag, verbose)

def __calc_lead(pr, hashes, deploy_epoch, release_num, verbose):
    pr_id, pr_branch, pr_url = __commit_msg(pr[0])
    pr_ts = __commit_date(pr[0])
    deploy_delay = deploy_epoch - pr_ts
    deploy_delay_h = round(deploy_delay/60/60, 2)
    # trace first commit of branch
    first_commit, commit_count = __find_first_commit(pr[0], hashes, verbose)
    first_commit_msg = __git(f'show --format=format:%s {first_commit}')[0]
    first_commit_auth = __git(f'show --format=format:%ae {first_commit}')[0]
    first_commit_ts = __commit_date(first_commit)
    lead_time = deploy_epoch - first_commit_ts
    lead_time_h = round(lead_time/60/60, 2)
    lead_time_d = round(lead_time/60/60/24, 2)

    print(f'pr-id:         {pr_id}')
    print(f'pr_branch:     {pr_branch}')
    print(f'pr_url:        {pr_url}')
    print(f'release-num:   {release_num}')
    print(f'merge-hash:    {pr[0]}')
    print(f'merge-time:    {__commit_datetime(pr[0])}')
    print(f'first-pr-hash: {first_commit}')
    print(f'first_pr_msg:  {first_commit_msg}')
    print(f'first-pr-time: {__commit_datetime(first_commit)}')
    print(f'commits:       {commit_count}')
    print(f'initator:      {first_commit_auth}')
    print(f'deploy-s:      {deploy_delay}')
    print(f'deploy-h:      {deploy_delay_h}')
    print(f'lead-time-s:   {lead_time}')
    print(f'lead-time-h:   {lead_time_h}')
    print(f'lead-time-d:   {lead_time_d}')
    print()

def __find_first_commit(merge_commit, hashes, verbose):
    __verbose('- merge commit: ' + merge_commit, verbose)
    parent = __git(
        f'show --format=format:%P --parents {merge_commit}'
        )[0].split(' ')[1]
    __verbose('- merge commit parent: ' + parent, verbose)
    first_commit = None
    commit_count = 0
    while True:
        parent_commits = [h for h in hashes if h[0] == parent]
        if not any(parent_commits):  # First commit in release window
            return first_commit, commit_count
        else:
            commit_count += 1
            parent_commit = parent_commits[0] 
            first_commit = parent_commit[0]
            parent = parent_commit[1]

def __commit_date(hash):
    return int(__git(f'show --format=format:%at {hash}')[0])


def __commit_datetime(hash):
    return __git(f'show --format=format:%ai {hash}')[0]


def __commit_msg(hash):
    msg = __git(f'show --format=format:%s {hash}')[0]
    pr_num = re.compile(r'#\d+').search(msg).group(0)[1:]
    pr_branch = re.compile(r'leanix/(.*)').search(msg).group(1)
    pr_url = f'https://github.com/leanix/leanix-pathfinder/pull/{pr_num}/commits'
    return pr_num, pr_branch, pr_url

def __verbose(msg, verbose):
    if verbose:
        pype.print_error(msg)

def __git(cmd):
    out, _ = sho('git ' + cmd)
    return [line for line in out.split('\n') if line]

if __name__ == "__main__":
    main()
