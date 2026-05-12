/**
 * Payroll Calculation Engine
 */

/**
 * Calculate PIT (Thuế TNCN) based on taxable income.
 * @param {number} taxableIncome 
 * @returns {number} taxAmount
 */
function calculateTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  // Brackets and cumulative shortcuts (tiền thuế lũy tiến)
  // Bậc 1: <= 5M -> 5%
  // Bậc 2: 5M - 10M -> 10% - 0.25M
  // Bậc 3: 10M - 18M -> 15% - 0.75M
  // Bậc 4: 18M - 32M -> 20% - 1.65M
  // Bậc 5: 32M - 52M -> 25% - 3.25M
  // Bậc 6: 52M - 80M -> 30% - 5.85M
  // Bậc 7: > 80M -> 35% - 9.85M

  if (taxableIncome <= 5000000) {
    return taxableIncome * 0.05;
  } else if (taxableIncome <= 10000000) {
    return taxableIncome * 0.1 - 250000;
  } else if (taxableIncome <= 18000000) {
    return taxableIncome * 0.15 - 750000;
  } else if (taxableIncome <= 32000000) {
    return taxableIncome * 0.2 - 1650000;
  } else if (taxableIncome <= 52000000) {
    return taxableIncome * 0.25 - 3250000;
  } else if (taxableIncome <= 80000000) {
    return taxableIncome * 0.3 - 5850000;
  } else {
    return taxableIncome * 0.35 - 9850000;
  }
}

/**
 * Calculate BHXH (10.5% for employee)
 */
function calculateBHXH(contractSalary) {
  // Usually capped at 20 times the minimum wage, but SPEC says 10.5% flat for now.
  return Math.round(contractSalary * 0.105);
}

/**
 * Calculate OT Pay
 */
function calculateOTPay(baseSalary, stdDays, hoursPerDay, otHours, otMultiplier) {
  if (otHours <= 0) return 0;
  const hourlyRate = baseSalary / stdDays / hoursPerDay;
  return Math.round(hourlyRate * otHours * otMultiplier);
}

/**
 * Convert number to Vietnamese words
 */
function numberToWords(amount) {
  if (amount === 0) return 'Không đồng';
  
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readTriple(n, isFirst) {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) {
      res += digits[h] + ' trăm ';
    } else if (!isFirst) {
      res += 'không trăm ';
    }
    
    if (t === 0) {
      if (u > 0 && (h > 0 || !isFirst)) res += 'lẻ ';
    } else if (t === 1) {
      res += 'mười ';
    } else {
      res += digits[t] + ' mươi ';
    }

    if (u === 1) {
      res += (t > 1) ? 'mốt' : 'một';
    } else if (u === 5) {
      res += (t > 0) ? 'lăm' : 'năm';
    } else if (u > 0) {
      res += digits[u];
    }
    
    return res.trim();
  }

  let res = '';
  let i = 0;
  let remaining = Math.round(amount);

  while (remaining > 0) {
    const triple = remaining % 1000;
    const isFirst = (remaining < 1000);
    if (triple > 0 || (i === 0 && amount === 0)) {
      const tripleStr = readTriple(triple, isFirst);
      res = tripleStr + ' ' + units[i] + ' ' + res;
    }
    remaining = Math.floor(remaining / 1000);
    i++;
  }

  res = res.trim();
  if (res.endsWith(' ')) res = res.slice(0, -1);
  
  // Capitalize first letter
  res = res.charAt(0).toUpperCase() + res.slice(1) + ' đồng';
  return res.replace(/\s+/g, ' ');
}

/**
 * Calculate full payroll detail for an employee
 */
function calculatePayrollDetail(employee, summary, stdDays) {
  const baseSalary = parseFloat(employee.base_salary);
  const stdHours   = parseFloat(employee.standard_hours_per_day);
  const dependents = parseInt(employee.dependents || 0);

  // Aggregate attendance data
  let totalWorkDays = 0;
  let totalOTPay    = 0;
  let totalOTHours  = 0;

  summary.forEach(day => {
    totalWorkDays += parseFloat(day.work_day_count);
    totalOTHours  += parseFloat(day.overtime_hours);
    
    if (day.overtime_hours > 0) {
      const dayOTPay = calculateOTPay(
        baseSalary, 
        stdDays, 
        stdHours, 
        day.overtime_hours, 
        day.ot_coefficient
      );
      totalOTPay += dayOTPay;
    }
  });

  const salaryByWorkDays = Math.round(baseSalary / stdDays * totalWorkDays);
  
  const allowanceResp      = parseFloat(employee.allowance_responsibility || 0);
  const allowancePhone     = parseFloat(employee.allowance_phone || 0);
  const allowanceTransport = parseFloat(employee.allowance_transport || 0);
  const allowanceWork      = parseFloat(employee.allowance_work || 0);
  
  // bonus_revenue is usually manual, here we return 0 as default
  const bonusRevenue = 0;

  const totalIncome = salaryByWorkDays + totalOTPay + allowanceResp + allowancePhone + allowanceTransport + allowanceWork + bonusRevenue;

  const bhxh = calculateBHXH(baseSalary);
  
  // Tax calculation
  const personalDeduction = 11000000;
  const dependentDeduction = 4400000 * dependents;
  const taxableIncome = totalIncome - bhxh - personalDeduction - dependentDeduction;
  const taxAmount = calculateTax(taxableIncome);

  const totalDeductions = bhxh + taxAmount; // Advance and other deductions are manual
  const netSalary = totalIncome - totalDeductions;

  return {
    base_salary_snapshot: baseSalary,
    standard_hours_snapshot: stdHours,
    standard_work_days_snapshot: stdDays,
    dependents_snapshot: dependents,
    actual_work_days: totalWorkDays,
    overtime_hours: totalOTHours,
    salary_by_work_days: salaryByWorkDays,
    overtime_pay: totalOTPay,
    allowance_responsibility: allowanceResp,
    allowance_phone: allowancePhone,
    allowance_transport: allowanceTransport,
    allowance_work: allowanceWork,
    bonus_revenue: bonusRevenue,
    total_income: totalIncome,
    social_insurance: bhxh,
    advance_payment: 0,
    tax_income: taxAmount,
    is_tax_override: false,
    tax_override_reason: null,
    other_deductions: 0,
    total_deductions: totalDeductions,
    net_salary: netSalary
  };
}

module.exports = {
  calculateTax,
  calculateBHXH,
  calculateOTPay,
  numberToWords,
  calculatePayrollDetail
};
