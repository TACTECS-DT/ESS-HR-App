from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestTasks(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.user = self.env['res.users'].create({
            'name': 'Task Test User',
            'login': 'task_test_user@test.com',
            'groups_id': [(6, 0, [
                self.env.ref('base.group_user').id,
                self.env.ref('project.group_project_user').id,
            ])],
        })
        self.employee = self.env['hr.employee'].create({
            'name': 'Task Test Employee',
            'company_id': self.company.id,
            'user_id': self.user.id,
        })
        self.project = self.env['project.project'].create({
            'name': 'Test Project',
            'company_id': self.company.id,
        })
        self.task = self.env['project.task'].create({
            'name': 'Test Task',
            'project_id': self.project.id,
            'user_ids': [(4, self.user.id)],
            'planned_hours': 8.0,
        })
        self.task_model = self.env['project.task']
        self.timesheet_model = self.env['account.analytic.line']

    def test_get_tasks_returns_list(self):
        """get_tasks returns a list of tasks assigned to the employee's user."""
        result = self.task_model.get_tasks(self.employee.id)
        self.assertIsInstance(result, list)
        ids = [t['id'] for t in result]
        self.assertIn(self.task.id, ids)

    def test_get_tasks_invalid_employee_raises(self):
        """get_tasks raises UserError for a non-existent employee."""
        with self.assertRaises(UserError):
            self.task_model.get_tasks(999999)

    def test_get_tasks_employee_without_user_returns_empty(self):
        """get_tasks returns an empty list for an employee without a linked user."""
        emp_no_user = self.env['hr.employee'].create({
            'name': 'No User Employee',
            'company_id': self.company.id,
        })
        result = self.task_model.get_tasks(emp_no_user.id)
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0)

    def test_get_task_detail_returns_dict(self):
        """get_task_detail returns a full dict with all expected keys."""
        result = self.task_model.get_task_detail(self.task.id)
        self.assertIsInstance(result, dict)
        for key in ('id', 'name', 'project_id', 'stage_id', 'priority', 'description'):
            self.assertIn(key, result)

    def test_get_task_detail_invalid_task_raises(self):
        """get_task_detail raises UserError for a non-existent task ID."""
        with self.assertRaises(UserError):
            self.task_model.get_task_detail(999999)

    def test_update_task_stage(self):
        """update_task_stage moves the task to the new stage."""
        stage = self.env['project.task.type'].create({'name': 'In Progress'})
        self.project.type_ids = [(4, stage.id)]
        result = self.task_model.update_task_stage(self.task.id, stage.id)
        self.assertTrue(result)
        self.assertEqual(self.task.stage_id.id, stage.id)

    def test_get_task_attachments_returns_list(self):
        """get_task_attachments returns a list (empty for a new task)."""
        result = self.task_model.get_task_attachments(self.task.id)
        self.assertIsInstance(result, list)

    def test_log_timesheet_creates_entry(self):
        """log_timesheet creates a timesheet entry and returns a dict."""
        result = self.timesheet_model.log_timesheet(
            self.employee.id, self.task.id, '2026-03-25', 2.5, 'Worked on feature'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['task_id'], self.task.id)
        self.assertAlmostEqual(result['unit_amount'], 2.5, places=2)

    def test_log_timesheet_zero_hours_raises(self):
        """log_timesheet raises UserError when unit_amount is zero."""
        with self.assertRaises(UserError):
            self.timesheet_model.log_timesheet(
                self.employee.id, self.task.id, '2026-03-25', 0.0, 'Empty log'
            )

    def test_get_daily_timesheet_returns_total(self):
        """get_daily_timesheet returns a dict with total_hours after logging."""
        self.timesheet_model.log_timesheet(
            self.employee.id, self.task.id, '2026-03-25', 3.0, 'Morning work'
        )
        self.timesheet_model.log_timesheet(
            self.employee.id, self.task.id, '2026-03-25', 2.0, 'Afternoon work'
        )
        result = self.timesheet_model.get_daily_timesheet(self.employee.id, '2026-03-25')
        self.assertIn('total_hours', result)
        self.assertAlmostEqual(result['total_hours'], 5.0, places=2)
        self.assertEqual(len(result['entries']), 2)

    def test_get_weekly_timesheet_grouped_by_day(self):
        """get_weekly_timesheet returns days grouped correctly for the week."""
        self.timesheet_model.log_timesheet(
            self.employee.id, self.task.id, '2026-03-23', 4.0, 'Monday'
        )
        self.timesheet_model.log_timesheet(
            self.employee.id, self.task.id, '2026-03-24', 3.0, 'Tuesday'
        )
        result = self.timesheet_model.get_weekly_timesheet(self.employee.id, '2026-03-23')
        self.assertIn('days', result)
        self.assertIn('total_hours', result)
        self.assertAlmostEqual(result['total_hours'], 7.0, places=2)
        dates_in_result = [d['date'] for d in result['days']]
        self.assertIn('2026-03-23', dates_in_result)
        self.assertIn('2026-03-24', dates_in_result)

    def test_format_task_summary_keys(self):
        """_format_task_summary returns all required summary keys."""
        summary = self.task_model._format_task_summary(self.task)
        for key in ('id', 'name', 'project_id', 'stage_id', 'priority', 'date_deadline'):
            self.assertIn(key, summary)
