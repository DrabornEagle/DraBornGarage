import json
import os
import re
import sys
import time

import pexpect


def clean(value: str) -> str:
    return re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', value or '')


def main() -> None:
    child = pexpect.spawn(
        './node_modules/.bin/eas',
        ['credentials', '-p', 'android'],
        cwd=os.getcwd(),
        env={**os.environ, 'CI': '0', 'TERM': 'xterm-256color'},
        encoding='utf-8',
        timeout=150,
    )
    stage = 0
    success = False
    history: list[str] = []
    patterns = [
        r'Which build profile do you want to configure',
        r'What do you want to do',
        r'Do you want to use this file',
        r'Use this file',
        r'Path to.*(?:JSON|json)',
        r'(?:Select|Choose).*Google Service Account',
        r'Google Service Account Key assigned.*FCM V1',
        r'FCM V1.*(?:set up|configured|assigned)',
        r'already.*FCM V1',
        r'Press any key',
        r'No credentials found',
        r'Error|Failed|Something went wrong',
        pexpect.EOF,
        pexpect.TIMEOUT,
    ]
    try:
        while True:
            index = child.expect(patterns)
            before = clean(child.before)
            if before.strip():
                history.append(before[-1200:])
            if index == 0:
                child.sendline('')
            elif index == 1:
                if stage in (0, 1):
                    child.send('\x1b[B')
                    child.sendline('')
                    stage += 1
                elif stage == 2:
                    child.sendline('')
                    stage = 3
                elif success:
                    break
                else:
                    child.sendline('')
            elif index in (2, 3):
                child.sendline('y')
            elif index in (4, 10):
                child.sendline(os.environ['FCM_KEY_PATH'])
            elif index == 5:
                child.sendline('')
            elif index in (6, 7, 8):
                success = True
                break
            elif index == 9:
                child.sendline('')
            elif index == 11:
                raise RuntimeError('EAS credentials menu reported an error')
            elif index == 12:
                joined = '\n'.join(history)
                success = 'FCM V1' in joined and ('assigned' in joined or 'set up' in joined)
                break
            else:
                raise RuntimeError('EAS credentials interaction timed out')
    finally:
        if child.isalive():
            child.sendcontrol('c')
            child.close(force=True)

    if not success:
        safe = '\n'.join(history)[-4000:]
        safe = safe.replace(os.environ.get('EXPO_TOKEN', ''), '[REDACTED]')
        raise RuntimeError(f'FCM V1 assignment was not confirmed.\n{safe}')

    os.makedirs('.runtime', exist_ok=True)
    with open('.runtime/eas-fcm-v1-status.json', 'w', encoding='utf-8') as handle:
        json.dump(
            {
                'configured': True,
                'androidPackage': 'com.draborneagle.draborngarage',
                'easProjectId': '98699f70-2c67-4e9f-8919-70e8243ce280',
                'configuredAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            },
            handle,
            indent=2,
        )
        handle.write('\n')
    print('EAS FCM V1 assignment confirmed')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
