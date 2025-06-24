const { MongoClient } = require('mongodb');

class PDFService {
  constructor(mongoUri) {
    this.mongoUri = mongoUri;
    this.db = null;
  }

  async connect() {
    if (this.mongoUri) {
      const client = new MongoClient(this.mongoUri);
      await client.connect();
      this.db = client.db();
      console.log('Connected to MongoDB');
    } else {
      console.log('Using sample data (no MongoDB connection)');
    }
  }

  async getUserData(userId) {
    if (this.db) {
      return await this.db.collection('users').findOne({ _id: userId });
    } else {
      return {
        _id: userId,
        fullName: "Hasnat Ashraf",
        accountNumber: "+92 324 9536391",
        username: "hasnat"
      };
    }
  }

  async getTransactions(userId) {
    if (this.db) {
      return await this.db.collection('transactions')
        .find({ userId: userId })
        .sort({ date: -1 })
        .toArray();
    } else {
      const currentDate = new Date();
      const transactions = [];
      
      const monthlyData = [
        { received: 50000, spent: 42000 },
        { received: 45000, spent: 38000 },
        { received: 52000, spent: 41000 },
        { received: 48000, spent: 35000 },
        { received: 47000, spent: 39000 },
        { received: 51000, spent: 44000 },
        { received: 49000, spent: 37000 },
        { received: 53000, spent: 46000 },
        { received: 46000, spent: 34000 },
        { received: 48000, spent: 40000 },
        { received: 50000, spent: 43000 },
        { received: 45000, spent: 36000 }
      ];

      monthlyData.forEach((month, index) => {
        const monthDate = new Date(currentDate);
        monthDate.setMonth(currentDate.getMonth() - index);
        
        transactions.push({
          userId: userId,
          amount: month.received,
          type: 'income',
          description: 'Monthly Salary',
          category: 'Salary',
          date: monthDate
        });
        
        transactions.push({
          userId: userId,
          amount: month.spent,
          type: 'expense',
          description: 'Monthly Expenses',
          category: 'General',
          date: monthDate
        });
      });
      
      return transactions;
    }
  }

  async getBudget(userId) {
    if (this.db) {
      const currentDate = new Date();
      const monthYear = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
      return await this.db.collection('budgets').findOne({ 
        userId: userId, 
        monthYear: monthYear 
      });
    } else {
      return {
        userId: userId,
        budgetAmount: 40000,
        monthYear: new Date().toISOString().slice(0, 7)
      };
    }
  }

  async generateStatementData(userId) {
    const user = await this.getUserData(userId);
    const transactions = await this.getTransactions(userId);
    const budget = await this.getBudget(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const currentDate = new Date();
    
    // Calculate current month totals
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
    });

    const totalReceived = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalSpent = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalReceived - totalSpent;
    const budgetAmount = budget ? Number(budget.budgetAmount) : 0;
    const remainingBudget = budgetAmount - totalSpent;
    const status = totalSpent > budgetAmount ? "Overspent" : "On Track";

    // Generate monthly history for last 12 months
    const monthlyHistory = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const monthReceived = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthSpent = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthName = monthDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });

      monthlyHistory.push({
        month: monthName,
        totalReceived: monthReceived,
        totalSpent: monthSpent,
        balance: monthReceived - monthSpent
      });
    }

    // Generate personalized tip
    const avgSpending = monthlyHistory.reduce((sum, m) => sum + m.totalSpent, 0) / monthlyHistory.length;
    let tip = "Keep tracking your expenses to maintain financial health!";
    
    if (totalSpent > avgSpending * 1.2) {
      tip = "Your spending this month is higher than usual. Consider reviewing your major expenses and see where you can cut back.";
    } else if (remainingBudget > 0) {
      tip = "Great job staying within budget! Consider saving the remaining amount for future goals.";
    } else {
      tip = "Small adjustments can make a big difference! A quick tip: Reviewing your top spending categories can help you plan better for next month.";
    }

    const getOrdinalSuffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return {
      user: {
        name: user.fullName,
        accountNumber: user.accountNumber
      },
      statement: {
        period: `${startOfMonth.getDate()}${getOrdinalSuffix(startOfMonth.getDate())} ${startOfMonth.toLocaleDateString('en-US', { month: 'short' })} - ${endOfMonth.getDate()}${getOrdinalSuffix(endOfMonth.getDate())} ${endOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/(\d+)/, (match) => match + getOrdinalSuffix(parseInt(match)))
      },
      budget: {
        totalReceived: totalReceived,
        totalSpent: totalSpent,
        balance: balance
      },
      analysis: {
        status: status,
        budgetSet: budgetAmount,
        remainingBudget: Math.max(0, remainingBudget)
      },
      tip: {
        content: tip
      },
      monthlyHistory: monthlyHistory
    };
  }
}

function generatePDFHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyHisaab - Account Statement</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f8fafc; color: #334155; line-height: 1.5; }
        .container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
        .header { text-align: center; padding: 32px; border-bottom: 1px solid #e2e8f0; }
        .logo { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .logo-icon { width: 32px; height: 32px; background: #ff6b47; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
        .logo-text { font-size: 24px; font-weight: bold; color: #1e293b; }
        .orange { color: #ff6b47; }
        .statement-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 24px; }
        .user-info { display: flex; justify-content: space-between; text-align: left; font-size: 14px; }
        .user-details h3 { font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .user-details p { color: #64748b; }
        .statement-info { text-align: right; }
        .statement-info p { margin-bottom: 2px; color: #64748b; }
        .statement-info .value { color: #1e293b; font-weight: 500; }
        .content { padding: 32px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
        .grid { display: grid; gap: 32px; grid-template-columns: 1fr 1fr; }
        .metric-cards { display: flex; flex-direction: column; gap: 16px; }
        .metric-card { display: flex; align-items: center; padding: 16px; border-radius: 12px; border: 1px solid; }
        .metric-card.green { background: #f0fdf4; border-color: #bbf7d0; }
        .metric-card.blue { background: #eff6ff; border-color: #93c5fd; }
        .metric-card.orange { background: #fff7ed; border-color: #fed7aa; }
        .metric-card.red { background: #fef2f2; border-color: #fecaca; }
        .metric-card.purple { background: #faf5ff; border-color: #d8b4fe; }
        .metric-card.teal { background: #f0fdfa; border-color: #5eead4; }
        .metric-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 18px; color: white; }
        .metric-icon.green { background: #22c55e; }
        .metric-icon.blue { background: #3b82f6; }
        .metric-icon.orange { background: #f59e0b; }
        .metric-icon.red { background: #ef4444; }
        .metric-icon.purple { background: #a855f7; }
        .metric-icon.teal { background: #14b8a6; }
        .metric-content .label { font-size: 14px; color: #64748b; margin-bottom: 2px; }
        .metric-content .value { font-size: 18px; font-weight: 600; color: #1e293b; }
        .overspent { color: #dc2626; }
        .on-track { color: #16a34a; }
        .tip-section { background: linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%); border: 1px solid #fed7aa; border-radius: 12px; padding: 24px; display: flex; gap: 16px; }
        .tip-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #ff6b47 0%, #ef4444 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
        .tip-content { font-size: 14px; color: #374151; line-height: 1.6; }
        .history-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; }
        .history-table thead { background: #f8fafc; }
        .history-table th, .history-table td { padding: 12px 16px; text-align: left; }
        .history-table th { font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
        .history-table tbody tr { border-bottom: 1px solid #f1f5f9; }
        .history-table tbody tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-green { color: #059669; font-weight: 500; }
        .text-red { color: #dc2626; font-weight: 500; }
        .footer { background: #f8fafc; padding: 24px 32px; }
        .support-section { background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
        .support-content { display: flex; align-items: center; gap: 16px; }
        .support-icon { width: 48px; height: 48px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
        .support-text h4 { font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .support-text p { font-size: 14px; color: #64748b; }
        .support-button { background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 500; border: none; font-size: 14px; }
        .footer-info { background: #1e293b; border-radius: 12px; padding: 24px; color: white; }
        .footer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .footer-logo { display: flex; align-items: center; gap: 12px; }
        .footer-logo-icon { width: 32px; height: 32px; background: #ff6b47; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .footer-logo-text { font-size: 18px; font-weight: bold; }
        .social-section { display: flex; align-items: center; gap: 16px; }
        .social-section span { font-size: 14px; color: #9ca3af; }
        .social-icons { display: flex; gap: 12px; }
        .social-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; text-decoration: none; }
        .instagram { background: #e1306c; }
        .facebook { background: #1877f2; }
        .linkedin { background: #0a66c2; }
        .footer-text { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .footer-links { display: flex; gap: 24px; margin-top: 16px; font-size: 12px; }
        .footer-links a { color: #9ca3af; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <div class="logo-icon">H</div>
                <div class="logo-text">My<span class="orange">Hisaab</span></div>
            </div>
            <div class="statement-title">Account Statement</div>
            <div class="user-info">
                <div class="user-details">
                    <h3>${data.user.name}</h3>
                    <p>Account Number: ${data.user.accountNumber}</p>
                </div>
                <div class="statement-info">
                    <p>Statement Period</p>
                    <p class="value">${data.statement.period}</p>
                    <p style="margin-top: 8px;">Date of Issue</p>
                    <p class="value">${data.statement.issueDate}</p>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="grid">
                <div class="section">
                    <div class="section-title">Budget Breakdown</div>
                    <div class="metric-cards">
                        <div class="metric-card green">
                            <div class="metric-icon green">↓</div>
                            <div class="metric-content">
                                <div class="label">Total Received</div>
                                <div class="value">Rs ${data.budget.totalReceived.toLocaleString()}</div>
                            </div>
                        </div>
                        <div class="metric-card blue">
                            <div class="metric-icon blue">📊</div>
                            <div class="metric-content">
                                <div class="label">Total Spent</div>
                                <div class="value">Rs ${data.budget.totalSpent.toLocaleString()}</div>
                            </div>
                        </div>
                        <div class="metric-card orange">
                            <div class="metric-icon orange">💰</div>
                            <div class="metric-content">
                                <div class="label">Balance</div>
                                <div class="value">Rs ${data.budget.balance.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Budget Analysis</div>
                    <div class="metric-cards">
                        <div class="metric-card ${data.analysis.status === 'Overspent' ? 'red' : 'green'}">
                            <div class="metric-icon ${data.analysis.status === 'Overspent' ? 'red' : 'green'}">${data.analysis.status === 'Overspent' ? '⚠️' : '✓'}</div>
                            <div class="metric-content">
                                <div class="label">Where do you stand</div>
                                <div class="value ${data.analysis.status === 'Overspent' ? 'overspent' : 'on-track'}">${data.analysis.status}</div>
                            </div>
                        </div>
                        <div class="metric-card purple">
                            <div class="metric-icon purple">🎯</div>
                            <div class="metric-content">
                                <div class="label">Budget Set</div>
                                <div class="value">Rs ${data.analysis.budgetSet.toLocaleString()}</div>
                            </div>
                        </div>
                        <div class="metric-card teal">
                            <div class="metric-icon teal">🏦</div>
                            <div class="metric-content">
                                <div class="label">Remaining Budget</div>
                                <div class="value">Rs ${data.analysis.remainingBudget.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid">
                <div class="section">
                    <div class="section-title">Personalised Tip</div>
                    <div class="tip-section">
                        <div class="tip-icon">💡</div>
                        <div class="tip-content">${data.tip.content}</div>
                    </div>
                </div>
                <div></div>
            </div>

            <div class="section">
                <div class="section-title">Previous Months (12)</div>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-right">Received</th>
                            <th class="text-right">Spent</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.monthlyHistory.map(month => `
                        <tr>
                            <td>${month.month}</td>
                            <td class="text-right text-green">Rs ${month.totalReceived.toLocaleString()}</td>
                            <td class="text-right text-red">Rs ${month.totalSpent.toLocaleString()}</td>
                            <td class="text-right">Rs ${month.balance.toLocaleString()}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <div class="support-section">
                <div class="support-content">
                    <div class="support-icon">🎧</div>
                    <div class="support-text">
                        <h4>Speak to us, wherever, whenever!</h4>
                        <p>Get real-time support from the MyHisaab team on WhatsApp—ready to assist you anytime, anywhere.</p>
                    </div>
                </div>
                <button class="support-button">📱 Talk to Human</button>
            </div>

            <div class="footer-info">
                <div class="footer-header">
                    <div class="footer-logo">
                        <div class="footer-logo-icon">H</div>
                        <div class="footer-logo-text">My<span class="orange">Hisaab</span></div>
                    </div>
                    <div class="social-section">
                        <span>Follow Us</span>
                        <div class="social-icons">
                            <a href="#" class="social-icon instagram">📷</a>
                            <a href="#" class="social-icon facebook">📘</a>
                            <a href="#" class="social-icon linkedin">💼</a>
                        </div>
                    </div>
                </div>
                <div class="footer-text">
                    MyHisaab provides personal financial and analytics, helping you navigate daily finances with precision. Receive real-time updates, holistic monthly reports, and get a supportive community that understands real financial challenges and triumphs of women.
                </div>
                <div class="footer-links">
                    <a href="#">TERMS AND CONDITIONS</a>
                    <a href="#">Privacy Policy</a>
                    <a href="#">Code Of Ethics</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = { PDFService, generatePDFHTML };