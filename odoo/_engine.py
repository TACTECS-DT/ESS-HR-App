#!/usr/bin/env python
"""
ESS HR — Odoo Test Runner
==========================
Runs ess_hr_client and ess_hr_admin tests against the local Odoo installation
at D:\\odoo19, shows live pass/fail results with API call details, and writes
all failures/exceptions to a timestamped log file in the same directory.

Usage:
    python run_tests.py                        # run both modules
    python run_tests.py --module client        # only ess_hr_client
    python run_tests.py --module admin         # only ess_hr_admin
    python run_tests.py --tags ess_auth        # specific tag(s)
    python run_tests.py --db ess-test          # different database

Exit codes:
    0  All tests passed (or no tests ran)
    1  One or more tests failed / errored
    2  Could not start Odoo (binary not found, DB connection failed, etc.)
"""
import argparse
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Reconfigure stdout/stderr to UTF-8 so Unicode symbols (✓ ✗ ⊘) work on
# Windows consoles that default to cp1252.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        try:
            _stream.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

# ═══════════════════════════════════════════════════════════════════════════════
#  Configuration — adjust if your layout differs
# ═══════════════════════════════════════════════════════════════════════════════
PYTHON_EXE  = r"d:\odoo19\python\python.exe"
ODOO_BIN    = r"d:\odoo19\server\odoo-bin"
ODOO_CONF   = r"d:\odoo19\server\odoo.conf"
DEFAULT_DB  = "ess-19"
SCRIPT_DIR  = Path(__file__).parent  # D:\ESS-HR-App\odoo\

# ═══════════════════════════════════════════════════════════════════════════════
#  Console colour helpers (disabled on Windows if ANSI not supported)
# ═══════════════════════════════════════════════════════════════════════════════
_ansi = sys.stdout.isatty() and os.name != 'nt' or os.environ.get('FORCE_COLOR')
GREEN  = '\033[32m' if _ansi else ''
RED    = '\033[31m' if _ansi else ''
YELLOW = '\033[33m' if _ansi else ''
CYAN   = '\033[36m' if _ansi else ''
BOLD   = '\033[1m'  if _ansi else ''
DIM    = '\033[2m'  if _ansi else ''
RESET  = '\033[0m'  if _ansi else ''

# Enable ANSI on Windows 10+
if os.name == 'nt':
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        _ansi = True
        GREEN  = '\033[32m'; RED    = '\033[31m'; YELLOW = '\033[33m'
        CYAN   = '\033[36m'; BOLD   = '\033[1m';  DIM    = '\033[2m'
        RESET  = '\033[0m'
    except Exception:
        pass

# ═══════════════════════════════════════════════════════════════════════════════
#  Regex patterns
# ═══════════════════════════════════════════════════════════════════════════════

# "test_login_badge_pin_success (ess_hr_client.tests.test_auth.TestAuth) ... ok"
RE_TEST_LINE = re.compile(
    r'(test\w+)\s+\(([\w.]+)\)\s+\.\.\.\s+(ok|FAIL|ERROR|skip(?:ped)?)',
    re.IGNORECASE,
)
# "[API] POST   /ess/api/auth/login                     200  OK   {tokens, user}"
RE_API_CALL = re.compile(
    r'^\[API\]\s+(\w+)\s+(\S+)\s+(\d+)\s+(OK|ERR)\s*(.*)'
)
# "Ran 54 tests in 12.34s"  (standard unittest)
RE_RAN = re.compile(r'Ran\s+(\d+)\s+tests?\s+in\s+([\d.]+)s', re.IGNORECASE)
# "128 post-tests in 18.73s, 6785 queries"  (Odoo 19 all-pass summary)
RE_ODOO_POST = re.compile(r'(\d+)\s+post-tests\s+in\s+([\d.]+)s')
# "14 failed, 11 error(s) of 128 tests when loading database 'ess-19'"  (Odoo 19)
RE_ODOO_SUMMARY = re.compile(
    r'(\d+)\s+failed,\s+(\d+)\s+error\(?s?\)?\s+of\s+(\d+)\s+tests?',
    re.IGNORECASE,
)
# "0 failed, 0 error(s) of 128 tests"  — all passed variant
RE_ODOO_SUMMARY_OK = re.compile(
    r'(\d+)\s+tests?\s+in\s+[\d.]+s|'
    r'(\d+)\s+(?:failed|error)',
    re.IGNORECASE,
)

# Fatal startup errors — these mean Odoo cannot continue
RE_FATAL = re.compile(
    r'(Cannot load module|ImportError|ModuleNotFoundError'
    r'|cannot connect to the database'
    r'|OperationalError.*database'
    r'|no module named'
    r'|Traceback \(most recent call last\)'
    r'|SyntaxError'
    r'|AttributeError.*module'
    r'|Failed to load|could not load)',
    re.IGNORECASE,
)
# "FAILED (failures=2, errors=1)"
RE_FAILED_SUMMARY = re.compile(r'FAILED\s*\((.+?)\)', re.IGNORECASE)
# Odoo 19: "Starting TestClass.test_name ..."
RE_STARTING = re.compile(r'^Starting\s+(\w+)\.(\w+)\s+\.\.\.')
# "OK" or "FAILED" as standalone summary
RE_FINAL_OK      = re.compile(r'^\s*OK\s*$')
RE_FINAL_FAILED  = re.compile(r'^\s*FAILED\s*$')
# start of a traceback block
RE_FAIL_HEADER   = re.compile(r'^(FAIL|ERROR)\s*:\s*(.+)$')
# Odoo log prefix — strip it to get the actual message
# format: "2026-04-02 10:00:00,123 12345 INFO ess-19 logger: message"
RE_LOG_PREFIX    = re.compile(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+ \d+ \w+ \S+ [\w.]+: ')


def strip_log_prefix(line: str) -> str:
    """Remove the Odoo log timestamp/pid/level prefix from a line."""
    return RE_LOG_PREFIX.sub('', line)


# ═══════════════════════════════════════════════════════════════════════════════
#  Build the odoo-bin command
# ═══════════════════════════════════════════════════════════════════════════════

MODULE_CONFIG = {
    'client': {
        'modules': 'ess_hr_client',
        'tags':    'ess_api',
    },
    'admin': {
        'modules': 'ess_hr_admin',
        'tags':    'ess_admin',
    },
    'both': {
        'modules': 'ess_hr_client,ess_hr_admin',
        'tags':    'ess_api,ess_admin',
    },
}


def build_command(db: str, module: str, tags: str) -> list:
    cfg = MODULE_CONFIG.get(module, MODULE_CONFIG['both'])
    modules = cfg['modules']
    test_tags = tags or cfg['tags']

    return [
        PYTHON_EXE, ODOO_BIN,
        '--config',        ODOO_CONF,
        '--database',      db,
        '--test-enable',
        '--stop-after-init',
        '--test-tags',     test_tags,
        '--no-http',                     # no HTTP server needed for tests
        '--log-level',     'test',
        '--log-handler',   'odoo.tests:INFO',
        '--log-handler',   'odoo.tests.runner:INFO',
        '--log-handler',   f'odoo.addons.ess_hr_client.tests:INFO',
        '--log-handler',   f'odoo.addons.ess_hr_admin.tests:INFO',
    ]


# ═══════════════════════════════════════════════════════════════════════════════
#  Output parser / accumulator
# ═══════════════════════════════════════════════════════════════════════════════

class TestResult:
    def __init__(self):
        self.passed  = []   # list of (test_name, class)
        self.failed  = []   # list of (test_name, class)
        self.errors  = []   # list of (test_name, class)
        self.skipped = []   # list of (test_name, class)
        self.ran     = 0
        self.duration = 0.0
        self.failure_blocks = []  # list of str (full traceback blocks)
        self._in_block = False
        self._current_block_lines = []
        self._pending_calls = []   # [API] lines buffered until test result arrives
        self._current_test = None  # (name, cls) of the test currently running
        self._current_test_failed = False  # True once FAIL/ERROR seen for current

    def _flush_current_as_pass(self):
        """Emit the current pending test as PASS and clear state."""
        if self._current_test and not self._current_test_failed:
            name, cls = self._current_test
            calls = list(self._pending_calls)
            self._pending_calls = []
            self.passed.append((name, cls))
            _print_test(name, cls, 'PASS', calls)
        elif self._current_test and self._current_test_failed:
            self._pending_calls = []  # already printed at FAIL/ERROR time
        self._current_test = None
        self._current_test_failed = False

    def feed_line(self, raw_line: str):
        """Process one output line: update counts and collect failure blocks."""
        line = strip_log_prefix(raw_line).rstrip()

        # ── [API] call lines emitted by _log_api_call() in common.py ─────────
        # Buffer them; they are printed grouped under the test result line.
        m_api = RE_API_CALL.match(line)
        if m_api and not self._in_block:
            self._pending_calls.append(m_api.groups())
            return

        # ── Detect start of a failure/error traceback block ───────────────────
        m_hdr = RE_FAIL_HEADER.match(line)
        if m_hdr:
            kind = m_hdr.group(1).upper()   # FAIL or ERROR
            # Emit the current test as FAIL/ERROR immediately
            if self._current_test:
                name, cls = self._current_test
                calls = list(self._pending_calls)
                self._pending_calls = []
                self._current_test_failed = True
                if kind == 'FAIL':
                    self.failed.append((name, cls))
                    _print_test(name, cls, 'FAIL', calls)
                else:
                    self.errors.append((name, cls))
                    _print_test(name, cls, 'ERROR', calls)
            # Start collecting the traceback
            if self._current_block_lines:
                self.failure_blocks.append('\n'.join(self._current_block_lines))
            self._in_block = True
            self._current_block_lines = [line]
            return

        # ── Accumulate lines inside a traceback block ─────────────────────────
        if self._in_block:
            # A new "Starting" line closes the current block (Odoo 19 style)
            if RE_STARTING.match(line):
                self.failure_blocks.append('\n'.join(self._current_block_lines))
                self._in_block = False
                self._current_block_lines = []
                # Fall through to handle the Starting line below
            elif line.startswith('-' * 20):
                self._current_block_lines.append(line)
                return
            elif RE_RAN.search(line) or RE_FINAL_OK.match(line) or RE_FINAL_FAILED.match(line):
                self._current_block_lines.append(line)
                self.failure_blocks.append('\n'.join(self._current_block_lines))
                self._in_block = False
                self._current_block_lines = []
                return
            else:
                self._current_block_lines.append(line)
                return

        # ── Odoo 19: "Starting TestClass.test_name ..." ───────────────────────
        m_start = RE_STARTING.match(line)
        if m_start:
            # Flush the previous test as PASS (if not already failed)
            self._flush_current_as_pass()
            cls_name  = m_start.group(1)
            test_name = m_start.group(2)
            self._current_test        = (test_name, cls_name)
            self._current_test_failed = False
            return

        # ── Standard unittest: "test_foo (Module.TestClass) ... ok/FAIL" ──────
        m_test = RE_TEST_LINE.search(line)
        if m_test:
            name, cls, status = m_test.group(1), m_test.group(2), m_test.group(3).lower()
            # A standard result supersedes any pending Odoo-19 tracking
            self._current_test        = None
            self._current_test_failed = False
            calls = list(self._pending_calls)
            self._pending_calls = []
            if status == 'ok':
                self.passed.append((name, cls))
                _print_test(name, cls, 'PASS', calls)
            elif status == 'fail':
                self.failed.append((name, cls))
                _print_test(name, cls, 'FAIL', calls)
            elif status == 'error':
                self.errors.append((name, cls))
                _print_test(name, cls, 'ERROR', calls)
            elif 'skip' in status:
                self.skipped.append((name, cls))
                _print_test(name, cls, 'SKIP', calls)
            return

        # ── "Ran N tests in Xs" (standard unittest) ──────────────────────────
        m_ran = RE_RAN.search(line)
        if m_ran:
            self.ran      = int(m_ran.group(1))
            self.duration = float(m_ran.group(2))

        # ── "128 post-tests in 18.73s" (Odoo 19 all-pass summary) ───────────
        m_post = RE_ODOO_POST.search(line)
        if m_post:
            self.ran      = int(m_post.group(1))
            self.duration = float(m_post.group(2))

        # ── "X failed, Y error(s) of Z tests" (Odoo 19 failure summary) ─────
        m_odoo = RE_ODOO_SUMMARY.search(line)
        if m_odoo and self.ran == 0:
            self.ran = int(m_odoo.group(3))

    def close(self):
        """Flush any pending test and open traceback block."""
        self._flush_current_as_pass()
        if self._current_block_lines:
            self.failure_blocks.append('\n'.join(self._current_block_lines))
            self._current_block_lines = []
            self._in_block = False

    @property
    def total_bad(self):
        return len(self.failed) + len(self.errors)

    @property
    def all_passed(self):
        return self.total_bad == 0 and self.ran > 0


def _print_test(name: str, cls: str, status: str, api_calls: list = None):
    """
    Print one test result line, preceded by the API calls it made.

    Example output:

        GET    /ess/api/attendance/summary            200  OK   {status, hours_worked_today}
        POST   /ess/api/attendance/check-in           200  OK   {id, check_in, employee_id}
        POST   /ess/api/attendance/check-out          200  OK   {id, check_out, worked_hours}
      ✓ PASS  TestAttendance.test_check_in_then_check_out

        POST   /ess/api/leave/approve                 500  ERR  VALIDATION_ERROR
      ✗ FAIL  TestLeave.test_leave_approve_workflow
    """
    short_cls = cls.split('.')[-1] if cls else ''
    label = f'{short_cls}.{name}'

    # ── Print buffered API calls for this test ────────────────────────────────
    if api_calls:
        for method, path, status_code, outcome, brief in api_calls:
            sc = int(status_code)
            if sc < 300:
                sc_color = GREEN
            elif sc < 500:
                sc_color = YELLOW
            else:
                sc_color = RED
            out_color = GREEN if outcome == 'OK' else RED
            # truncate brief so lines don't wrap
            brief_str = brief[:55] if brief else ''
            print(
                f'    {DIM}{method:<6}{RESET}'
                f' {path:<50}'
                f' {sc_color}{status_code}{RESET}'
                f'  {out_color}{outcome:<3}{RESET}'
                f'  {DIM}{brief_str}{RESET}'
            )

    # ── Test result line ──────────────────────────────────────────────────────
    if status == 'PASS':
        print(f'  {GREEN}✓ PASS{RESET}  {DIM}{label}{RESET}')
    elif status == 'FAIL':
        print(f'  {RED}✗ FAIL{RESET}  {label}')
    elif status == 'ERROR':
        print(f'  {RED}✗ ERROR{RESET} {label}')
    elif status == 'SKIP':
        print(f'  {YELLOW}⊘ SKIP{RESET}  {DIM}{label}{RESET}')

    # Blank line between tests for readability
    print()


# ═══════════════════════════════════════════════════════════════════════════════
#  Log file writer
# ═══════════════════════════════════════════════════════════════════════════════

def write_log(result: TestResult, raw_output: str, log_path: Path, cmd: list):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write('=' * 70 + '\n')
        f.write(f'  ESS HR Odoo Test Run — {ts}\n')
        f.write(f'  Command : {" ".join(cmd)}\n')
        f.write('=' * 70 + '\n\n')

        # ── Summary ──────────────────────────────────────────────────────────
        f.write('SUMMARY\n')
        f.write('-' * 40 + '\n')
        f.write(f'  Total run  : {result.ran}\n')
        f.write(f'  Passed     : {len(result.passed)}\n')
        f.write(f'  Failed     : {len(result.failed)}\n')
        f.write(f'  Errors     : {len(result.errors)}\n')
        f.write(f'  Skipped    : {len(result.skipped)}\n')
        f.write(f'  Duration   : {result.duration:.2f}s\n')
        f.write(f'  Result     : {"PASSED" if result.all_passed else "FAILED"}\n\n')

        # ── Failed tests list ─────────────────────────────────────────────────
        if result.failed or result.errors:
            f.write('FAILED / ERRORED TESTS\n')
            f.write('-' * 40 + '\n')
            for name, cls in result.failed:
                f.write(f'  FAIL   {cls}.{name}\n')
            for name, cls in result.errors:
                f.write(f'  ERROR  {cls}.{name}\n')
            f.write('\n')

            # ── Failure tracebacks ────────────────────────────────────────────
            if result.failure_blocks:
                f.write('FAILURE DETAILS / TRACEBACKS\n')
                f.write('=' * 70 + '\n\n')
                for block in result.failure_blocks:
                    f.write(block)
                    f.write('\n' + '-' * 70 + '\n\n')

        # ── Skipped tests ─────────────────────────────────────────────────────
        if result.skipped:
            f.write('SKIPPED TESTS\n')
            f.write('-' * 40 + '\n')
            for name, cls in result.skipped:
                f.write(f'  SKIP   {cls}.{name}\n')
            f.write('\n')

        # ── Full raw output ───────────────────────────────────────────────────
        f.write('FULL ODOO OUTPUT\n')
        f.write('=' * 70 + '\n')
        f.write(raw_output)


# ═══════════════════════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='ESS HR Odoo Test Runner')
    parser.add_argument('--module', default='both',
                        choices=['client', 'admin', 'both'],
                        help='Which module to test (default: both)')
    parser.add_argument('--db',   default=DEFAULT_DB,
                        help=f'Database name (default: {DEFAULT_DB})')
    parser.add_argument('--tags', default='',
                        help='Comma-separated test tags to run (overrides defaults)')
    args = parser.parse_args()

    # ── Validate paths ────────────────────────────────────────────────────────
    for label, path in [('Python', PYTHON_EXE), ('odoo-bin', ODOO_BIN),
                        ('odoo.conf', ODOO_CONF)]:
        if not os.path.exists(path):
            print(f'{RED}ERROR:{RESET} {label} not found: {path}')
            sys.exit(2)

    cmd = build_command(args.db, args.module, args.tags)

    ts_str   = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_path = SCRIPT_DIR / f'test_errors_{ts_str}.txt'

    # ── Banner ────────────────────────────────────────────────────────────────
    print(f'\n{BOLD}{"=" * 60}{RESET}')
    print(f'{BOLD}  ESS HR Odoo Test Runner  —  {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}{RESET}')
    print(f'  Database : {args.db}')
    print(f'  Modules  : {MODULE_CONFIG[args.module]["modules"]}')
    print(f'  Tags     : {args.tags or MODULE_CONFIG[args.module]["tags"]}')
    print(f'  Log file : {log_path}')
    print(f'{BOLD}{"=" * 60}{RESET}\n')

    result           = TestResult()
    all_output       = []
    current_section  = ''
    _startup_phase   = 'init'   # init → scanning → loading → ready → testing
    _fatal_lines     = []       # lines accumulated from a startup traceback
    _in_traceback    = False    # True only during startup traceback collection
    _fatal_hit       = False    # set once a fatal startup error is confirmed

    # ── Helper: overwrite a status line without leaving old characters ────────
    def _status(text: str, done: bool = False):
        """Print a startup-phase status line, clearing the previous one."""
        marker = f'{GREEN}✓{RESET}' if done else ' '
        line = f'  [{marker}] {text}'
        # pad to 55 chars so any shorter previous line is fully overwritten
        sys.stdout.write(f'\r{line:<55}')
        if done:
            sys.stdout.write('\n')
        sys.stdout.flush()

    # ── Run Odoo ──────────────────────────────────────────────────────────────
    print(f'{YELLOW}  Starting Odoo — please wait (typically 30–60 s) ...{RESET}')
    _status('Initialising ...')

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
        )
    except FileNotFoundError as e:
        print(f'\n{RED}ERROR:{RESET} Could not start Odoo — {e}')
        sys.exit(2)

    def _show_fatal(lines: list, reason: str):
        """Print a big red fatal-error box and kill the Odoo process."""
        print(f'\n{RED}{"=" * 60}{RESET}')
        print(f'{RED}{BOLD}  FATAL ERROR — Odoo could not start{RESET}')
        print(f'{RED}{"=" * 60}{RESET}')
        for ln in lines[-30:]:
            print(f'  {RED}{ln}{RESET}')
        print(f'{RED}{"=" * 60}{RESET}')
        print(f'\n  Fix the error above and run the tests again.\n')
        try:
            proc.kill()
        except Exception:
            pass

    # ── Stream output line by line ────────────────────────────────────────────
    try:
      for raw_line in proc.stdout:
        all_output.append(raw_line)
        stripped = strip_log_prefix(raw_line).rstrip()

        # ── Traceback detection — STARTUP ONLY (not during test phase) ────────
        # During tests, tracebacks are normal failures handled by feed_line().
        if _startup_phase != 'testing':
            if 'Traceback (most recent call last)' in raw_line:
                _in_traceback = True
                _fatal_lines  = [stripped]
                continue
            if _in_traceback:
                _fatal_lines.append(stripped)
                # Non-indented non-empty line = the exception type line (end of TB)
                is_end = (stripped
                          and not stripped.startswith(' ')
                          and not stripped.startswith('File ')
                          and not stripped.startswith('During')
                          and len(_fatal_lines) > 2)
                if is_end:
                    _in_traceback = False
                    if not _fatal_hit:
                        _fatal_hit = True
                        _show_fatal(_fatal_lines, stripped)
                        for _ in proc.stdout:
                            all_output.append(_)
                        break
                continue

            # Fatal keyword (non-traceback) during startup only
            if not _fatal_hit and re.search(r'\bCRITICAL\b', raw_line):
                if 'Cannot load module' in raw_line \
                        or 'cannot connect to the database' in raw_line.lower() \
                        or 'SyntaxError' in stripped \
                        or 'no module named' in stripped.lower():
                    _fatal_hit = True
                    _show_fatal([stripped], stripped)
                    for _ in proc.stdout:
                        all_output.append(_)
                    break

        # ── Startup progress indicators ───────────────────────────────────────
        if _startup_phase != 'testing':
            if 'updating modules list' in raw_line and _startup_phase == 'init':
                _startup_phase = 'scanning'
                _status('Initialising ...', done=True)
                _status('Scanning addons ...')
            elif re.search(r'loading \d+ modules', raw_line) and _startup_phase in ('init', 'scanning'):
                m_cnt = re.search(r'loading (\d+) modules', raw_line)
                count = m_cnt.group(1) if m_cnt else '?'
                if _startup_phase == 'init':
                    _status('Initialising ...', done=True)
                else:
                    _status('Scanning addons ...', done=True)
                _startup_phase = 'loading'
                _status(f'Loading {count} modules ...')
            elif 'Registry loaded' in raw_line and _startup_phase in ('init', 'scanning', 'loading'):
                _startup_phase = 'ready'
                _status('Loading modules ...', done=True)
                _status('Preparing tests ...')
            elif 'post tests' in raw_line.lower() and _startup_phase in ('init', 'ready', 'loading'):
                _startup_phase = 'testing'
                _status('Preparing tests ...', done=True)
                print()  # blank line before test output
            # If we see actual test output, we must be in testing phase
            elif RE_TEST_LINE.search(stripped) or RE_API_CALL.match(stripped):
                if _startup_phase != 'testing':
                    _startup_phase = 'testing'
                    _status('Preparing tests ...', done=True)
                    print()

        # ── Detect test section (which module) ────────────────────────────────
        if 'TESTING the following' in raw_line or 'running tests' in raw_line.lower():
            m = re.search(r'(ess_hr_\w+)', raw_line)
            section = m.group(1) if m else ''
            if section != current_section:
                current_section = section
                print(f'\n{CYAN}{BOLD}── {section} ──{RESET}')

        # Feed to parser (handles test results and block accumulation)
        result.feed_line(raw_line)

        # Print non-test CRITICAL/ERROR lines during the test phase
        if _startup_phase == 'testing':
            if re.search(r'\bCRITICAL\b', raw_line) and not RE_TEST_LINE.search(raw_line):
                if not RE_FAIL_HEADER.match(stripped) and '[API]' not in stripped:
                    print(f'  {RED}[odoo CRITICAL]{RESET} {stripped}')
            elif re.search(r'\bERROR\b', raw_line) and not RE_TEST_LINE.search(raw_line):
                if not RE_FAIL_HEADER.match(stripped) and '[API]' not in stripped:
                    # Suppress known noisy-but-harmless errors
                    if 'bad query' not in stripped and 'Exception during request' not in stripped:
                        print(f'  {RED}[odoo error]{RESET} {stripped}')

    except Exception as _loop_exc:
        print(f'\n{RED}[runner error]{RESET} Output parser crashed: {_loop_exc}')

    try:
        proc.wait(timeout=600)   # 10-minute hard limit; kills the hang
    except subprocess.TimeoutExpired:
        print(f'\n{RED}[runner]{RESET} Odoo did not exit after 10 minutes — killing process.')
        proc.kill()
        proc.wait()
    result.close()
    raw_output_str = ''.join(all_output)

    # ── If fatal error hit, write log and exit ────────────────────────────────
    if _fatal_hit:
        write_log(result, raw_output_str, log_path, cmd)
        try:
            os.startfile(str(log_path))
        except Exception:
            pass
        sys.exit(2)

    # ── Always write the log file ─────────────────────────────────────────────
    write_log(result, raw_output_str, log_path, cmd)

    # ── Final summary ─────────────────────────────────────────────────────────
    print(f'\n{BOLD}{"=" * 60}{RESET}')

    if result.ran == 0:
        print(f'{YELLOW}  WARNING: No tests were detected in the output.{RESET}')
        print(f'  This may mean the modules failed to load or no tests matched the tags.')
        print(f'  Check the full output in: {log_path}')
        print(f'{BOLD}{"=" * 60}{RESET}\n')
        try:
            os.startfile(str(log_path))
        except Exception:
            pass
        sys.exit(2)

    bad = result.total_bad
    print(f'  Ran      : {result.ran} tests in {result.duration:.2f}s')
    print(f'  {GREEN}Passed  : {len(result.passed)}{RESET}')
    if result.skipped:
        print(f'  {YELLOW}Skipped : {len(result.skipped)}{RESET}')
    if bad:
        print(f'  {RED}Failed  : {len(result.failed)}{RESET}')
        print(f'  {RED}Errors  : {len(result.errors)}{RESET}')
        print()
        print(f'  {RED}RESULT  : FAILED{RESET}')
        print(f'  Failures and tracebacks written to:')
        print(f'  {log_path}')
    else:
        print(f'\n  {GREEN}{BOLD}RESULT  : ALL TESTS PASSED ✓{RESET}')
        print(f'  Log written to: {log_path}')

    print(f'{BOLD}{"=" * 60}{RESET}\n')

    # ── Print failure details to console ──────────────────────────────────────
    if bad and result.failure_blocks:
        print(f'{RED}{"=" * 60}{RESET}')
        print(f'{RED}  FAILURE DETAILS{RESET}')
        print(f'{RED}{"=" * 60}{RESET}')
        for block in result.failure_blocks:
            for bline in block.splitlines():
                if not bline.startswith('-' * 10):
                    print(f'  {bline}')
            print()

    # ── Auto-open the log file on failure ─────────────────────────────────────
    if bad or result.ran == 0:
        try:
            os.startfile(str(log_path))
        except Exception:
            pass

    sys.exit(0 if result.all_passed else 1)


if __name__ == '__main__':
    main()
