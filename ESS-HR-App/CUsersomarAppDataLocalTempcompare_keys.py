import json
import os

# Read translation files
with open('d:/work/ESS-HR-App/app/src/i18n/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open('d:/work/ESS-HR-App/app/src/i18n/ar.json', 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

def flatten_keys(obj, prefix=''):
    keys = []
    for k, v in obj.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.extend(flatten_keys(v, full_key))
        else:
            keys.append(full_key)
    return keys

def get_nested_value(obj, path):
    """Get value from nested dict using dot notation"""
    parts = path.split('.')
    current = obj
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current

en_keys = set(flatten_keys(en_data))
ar_keys = set(flatten_keys(ar_data))

# Read used keys - capture them from inline
used_keys_list = [
    'advanceSalary.amount', 'advanceSalary.basicSalary', 'advanceSalary.maxAdvance', 
    'advanceSalary.maxAllowed', 'advanceSalary.reason', 'advanceSalary.recentRequests',
    'advanceSalary.request', 'advanceSalary.saveDraft', 'advanceSalary.title',
    'advanceSalary.titleField', 'announcements.empty', 'announcements.title',
    'attendance.checkIn', 'attendance.checkOut', 'attendance.dailySheet',
    'attendance.filterCustom', 'attendance.filterLastMonth', 'attendance.filterThisMonth',
    'attendance.history', 'attendance.late', 'attendance.location',
    'attendance.monthlySheet', 'attendance.onTime', 'attendance.status.absent',
    'attendance.status.on_leave', 'attendance.status.present', 'attendance.status.public_holiday',
    'attendance.status.weekend', 'attendance.task', 'attendance.title',
    'attendance.totalHours', 'attendance.workedHours', 'auth.activate',
    'auth.badgeId', 'auth.badgeIdPlaceholder', 'auth.errors.invalidLicense',
    'auth.forgotPassword', 'auth.licenseKey', 'auth.licenseKeyPlaceholder',
    'auth.licenseSubtitle', 'auth.licenseTitle', 'auth.login',
    'auth.loginSubtitle', 'auth.loginTitle', 'auth.loginWithBadge',
    'auth.loginWithUsername', 'auth.password', 'auth.passwordPlaceholder',
    'auth.passwordReset.codePlaceholder', 'auth.passwordReset.confirmPassword',
    'auth.passwordReset.email', 'auth.passwordReset.newPassword', 'auth.passwordReset.resetSuccess',
    'auth.passwordReset.sendCode', 'auth.passwordReset.subtitle', 'auth.passwordReset.title',
    'auth.passwordReset.verifyCode', 'auth.pin', 'auth.pinPlaceholder',
    'auth.selectCompany', 'auth.selectCompanySubtitle', 'auth.username',
    'auth.usernamePlaceholder', 'businessService.reason', 'businessService.request',
    'businessService.requestedDate', 'businessService.saveDraft', 'businessService.serviceTitle',
    'businessService.serviceType', 'businessService.title', 'businessService.wantedDate',
    'calendar.absent', 'calendar.legend', 'calendar.onLeave',
    'calendar.present', 'calendar.title', 'chat.online',
    'chat.placeholder', 'chat.title', 'common.all',
    'common.cancel', 'common.confirm', 'common.date',
    'common.delete', 'common.done', 'common.error',
    'common.filter', 'common.loading', 'common.myRequests',
    'common.noData', 'common.noInternet', 'common.sar',
    'common.status.done', 'common.status.draft', 'common.status.pending',
    'common.submit', 'documentRequest.documentType', 'documentRequest.previousRequests',
    'documentRequest.reason', 'documentRequest.request', 'documentRequest.requestTitle',
    'documentRequest.returnDate', 'documentRequest.saveDraft', 'documentRequest.title',
    'expCert.certTitle', 'expCert.directedTo', 'expCert.directedToPlaceholder',
    'expCert.purpose', 'expCert.request', 'expCert.requiredDate',
    'expCert.saveDraft', 'expCert.title', 'expense.amount',
    'expense.category', 'expense.create', 'expense.currency',
    'expense.date', 'expense.description', 'expense.myExpenses',
    'expense.notes', 'expense.paymentMode', 'expense.paymentMode.label',
    'expense.quantity', 'expense.receipt', 'expense.tax',
    'expense.title', 'expense.uploadReceipt', 'home.more',
    'home.services', 'home.title', 'hrLetter.directedTo',
    'hrLetter.letterTitle', 'hrLetter.newRequest', 'hrLetter.previousRequests',
    'hrLetter.purpose', 'hrLetter.request', 'hrLetter.requiredDate',
    'hrLetter.salaryType', 'hrLetter.saveDraft', 'hrLetter.title',
    'leave.actions.approve', 'leave.actions.refuse', 'leave.actions.resetToDraft',
    'leave.all', 'leave.approvalHistory', 'leave.attachment',
    'leave.balance', 'leave.dateFrom', 'leave.dateTo',
    'leave.days', 'leave.daysDeducted', 'leave.description',
    'leave.durationType', 'leave.leaveType', 'leave.noLimit',
    'leave.onLeave', 'leave.pending', 'leave.recentRequests',
    'leave.remainingAfter', 'leave.request', 'leave.saveDraft',
    'leave.submitRequest', 'leave.teamBalance', 'leave.teamMembers',
    'leave.title', 'leave.uploadFile', 'loan.amount',
    'loan.apply', 'loan.approvalChain', 'loan.duration',
    'loan.eligible', 'loan.installmentAmount', 'loan.installments',
    'loan.loanTitle', 'loan.maxAmount', 'loan.maxDuration',
    'loan.month', 'loan.monthly', 'loan.monthlyInstallment',
    'loan.months', 'loan.notEligible', 'loan.paymentEnd',
    'loan.paymentStart', 'loan.reason', 'loan.title',
    'loan.transferMethod', 'notifications.empty', 'notifications.markAllRead',
    'notifications.title', 'payslip.deductions', 'payslip.download',
    'payslip.earnings', 'payslip.gross', 'payslip.lastYear',
    'payslip.net', 'payslip.period', 'payslip.share',
    'payslip.thisYear', 'payslip.title', 'pendingApprovals.advanceSalary',
    'pendingApprovals.all', 'pendingApprovals.expense', 'pendingApprovals.expenses',
    'pendingApprovals.leaveRequest', 'pendingApprovals.leaves', 'pendingApprovals.loan',
    'pendingApprovals.loans', 'pendingApprovals.other', 'pendingApprovals.title',
    'profile.badgeId', 'profile.basicSalary', 'profile.company',
    'profile.contact', 'profile.contract', 'profile.contractType',
    'profile.dateOfBirth'
