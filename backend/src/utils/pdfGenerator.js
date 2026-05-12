const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { numberToWords } = require('./payrollEngine');

const TEMPLATE_PATH = path.join(__dirname, '../templates/payslip.html');

/**
 * Format number to currency string
 */
function fmt(num) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

/**
 * Fill template with data
 */
function fillTemplate(template, data) {
  let html = template;
  for (const key in data) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(placeholder, data[key]);
  }
  return html;
}

/**
 * Get Initials for Avatar
 */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate PDF for a single employee
 */
async function generatePayslip(payrollDetail, period) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  
  const data = {
    periodName: `THÁNG ${period.month}/${period.year}`,
    companyName: 'Nhà hàng ABC', // Có thể lấy từ config
    avatarInitials: getInitials(payrollDetail.full_name),
    fullName: payrollDetail.full_name,
    employeeId: payrollDetail.employee_id,
    department: payrollDetail.department,
    employmentType: payrollDetail.employment_type === 'TNC' ? 'Toàn thời gian' : 'Thời vụ',
    actualWorkDays: payrollDetail.actual_work_days,
    stdWorkDays: payrollDetail.standard_work_days_snapshot,
    salaryByWorkDays: fmt(payrollDetail.salary_by_work_days),
    overtimePay: fmt(payrollDetail.overtime_pay),
    allowanceResponsibility: fmt(payrollDetail.allowance_responsibility),
    allowancePhone: fmt(payrollDetail.allowance_phone),
    allowanceTransport: fmt(payrollDetail.allowance_transport),
    bonusRevenue: fmt(payrollDetail.bonus_revenue),
    totalIncome: fmt(payrollDetail.total_income),
    socialInsurance: fmt(payrollDetail.social_insurance),
    taxIncome: fmt(payrollDetail.tax_income),
    advancePayment: fmt(payrollDetail.advance_payment),
    otherDeductions: fmt(payrollDetail.other_deductions),
    totalDeductions: fmt(payrollDetail.total_deductions),
    netSalary: fmt(payrollDetail.net_salary),
    netSalaryWords: numberToWords(payrollDetail.net_salary),
    currentDate: new Date().toLocaleDateString('vi-VN')
  };

  const html = fillTemplate(template, data);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return pdf;
}

/**
 * Generate PDF for multiple employees (Batch)
 */
async function generateBatchPayslips(details, period) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  let fullHtml = '';

  details.forEach((pd, index) => {
    const data = {
      periodName: `THÁNG ${period.month}/${period.year}`,
      companyName: 'Nhà hàng ABC',
      avatarInitials: getInitials(pd.full_name),
      fullName: pd.full_name,
      employeeId: pd.employee_id,
      department: pd.department,
      employmentType: pd.employment_type === 'TNC' ? 'Toàn thời gian' : 'Thời vụ',
      actualWorkDays: pd.actual_work_days,
      stdWorkDays: pd.standard_work_days_snapshot,
      salaryByWorkDays: fmt(pd.salary_by_work_days),
      overtimePay: fmt(pd.overtime_pay),
      allowanceResponsibility: fmt(pd.allowance_responsibility),
      allowancePhone: fmt(pd.allowance_phone),
      allowanceTransport: fmt(pd.allowance_transport),
      bonusRevenue: fmt(pd.bonus_revenue),
      totalIncome: fmt(pd.total_income),
      socialInsurance: fmt(pd.social_insurance),
      taxIncome: fmt(pd.tax_income),
      advancePayment: fmt(pd.advance_payment),
      otherDeductions: fmt(pd.other_deductions),
      totalDeductions: fmt(pd.total_deductions),
      netSalary: fmt(pd.net_salary),
      netSalaryWords: numberToWords(pd.net_salary),
      currentDate: new Date().toLocaleDateString('vi-VN')
    };

    let pageHtml = fillTemplate(template, data);
    // Add page break if not the last one
    if (index < details.length - 1) {
      pageHtml = pageHtml.replace('</body>', '<div class="page-break"></div></body>');
    }
    fullHtml += pageHtml;
  });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return pdf;
}

module.exports = { generatePayslip, generateBatchPayslips };
