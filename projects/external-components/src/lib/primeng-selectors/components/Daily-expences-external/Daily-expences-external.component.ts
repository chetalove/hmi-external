import { Component } from '@angular/core';
import { CommonExternalComponent } from '../common-external/common-external.component';

interface Expense {
  id: number;
  user: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  date: string; // YYYY-MM-DD
  recurring?: boolean;
  recurrenceType?: 'Daily' | 'Weekly' | 'Monthly';
}

interface BudgetLimit {
  category: string;
  limit: number;
}

@Component({
  selector: 'app-daily-expences',
  template: `
    <div class="exp-container" *ngIf="isAuthenticated(); else loginForm">
      <h2>Expense Tracker</h2>
      <div class="exp-user">User: {{ currentUser }}</div>
      <form (ngSubmit)="addExpense()" #expenseForm="ngForm" class="exp-form">
        <input type="text" placeholder="Description" [(ngModel)]="newExpense.description" name="description" required />
        <input type="number" placeholder="Amount" [(ngModel)]="newExpense.amount" name="amount" required min="0.01" step="0.01"/>
        <select [(ngModel)]="newExpense.category" name="category" required (change)="updateSubcategories()">
          <option value="" disabled selected>Select Category</option>
          <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
        </select>
        <select [(ngModel)]="newExpense.subcategory" name="subcategory" required>
          <option value="" disabled selected>Select Subcategory</option>
          <option *ngFor="let sub of subcategories[newExpense.category] || []" [value]="sub">{{ sub }}</option>
        </select>
        <input type="date" [(ngModel)]="newExpense.date" name="date" required />
        <label>
          <input type="checkbox" [(ngModel)]="newExpense.recurring" name="recurring" /> Recurring
        </label>
        <select *ngIf="newExpense.recurring" [(ngModel)]="newExpense.recurrenceType" name="recurrenceType" required>
          <option value="" disabled selected>Select Frequency</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
        <button type="submit" [disabled]="!expenseForm.form.valid">Add</button>
      </form>

      <div class="exp-filters">
        <label>
          Day:
          <input type="date" [(ngModel)]="filterDay" name="filterDay" (change)="applyFilters()" />
        </label>
        <label>
          Month:
          <input type="month" [(ngModel)]="filterMonth" name="filterMonth" (change)="applyFilters()" />
        </label>
        <label>
          Category:
          <select [(ngModel)]="filterCategory" name="filterCategory" (change)="applyFilters()">
            <option value="">All</option>
            <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
          </select>
        </label>
        <label>
          Subcategory:
          <select [(ngModel)]="filterSubcategory" name="filterSubcategory" (change)="applyFilters()">
            <option value="">All</option>
            <option *ngFor="let sub of allSubcategories()" [value]="sub">{{ sub }}</option>
          </select>
        </label>
        <button (click)="clearFilters()">Clear Filters</button>
        <button (click)="exportCSV()" class="exp-export">Export CSV</button>
        <button (click)="logout()" class="exp-logout">Logout</button>
      </div>

      <div class="exp-budget">
        <h4>Budget Limits per Category</h4>
        <ul>
          <li *ngFor="let cat of categories">
            {{cat}}:
            <input type="number" [(ngModel)]="getBudgetLimit(cat).limit" (change)="setBudgetLimit(cat, getBudgetLimit(cat).limit)" min="0" placeholder="No limit" style="width:80px;">
            <span *ngIf="getCategoryTotal(cat) > getBudgetLimit(cat).limit && getBudgetLimit(cat).limit > 0" class="exp-overbudget">
              Over budget!
            </span>
          </li>
        </ul>
      </div>

      <div class="exp-notifications" *ngIf="notifications.length">
        <div *ngFor="let note of notifications" class="exp-note">{{note}}</div>
      </div>

      <div class="exp-list">
        <h3 *ngIf="filterDay">Expenses for {{ filterDay }}</h3>
        <h3 *ngIf="!filterDay && filterMonth">Expenses for {{ filterMonth }}</h3>
        <h3 *ngIf="!filterDay && !filterMonth">All Expenses</h3>
        <ul *ngIf="filteredExpenses.length; else noExp">
          <li *ngFor="let exp of filteredExpenses">
            <span>
              {{ exp.date }} - {{ exp.description }} ({{ exp.category }} > {{ exp.subcategory }}) - ${{ exp.amount.toFixed(2) }}
              <span *ngIf="exp.recurring">[{{exp.recurrenceType}}]</span>
            </span>
            <button (click)="deleteExpense(exp.id)">Delete</button>
          </li>
        </ul>
        <ng-template #noExp><p>No expenses found.</p></ng-template>
        <div class="exp-total">
          Total: ${{ getFilteredTotal().toFixed(2) }}
        </div>
      </div>
    </div>
    <ng-template #loginForm>
      <div class="exp-login">
        <h2>Login</h2>
        <form (ngSubmit)="login()" #loginNgForm="ngForm">
          <input type="text" placeholder="Username" [(ngModel)]="loginUser" name="loginUser" required />
          <input type="password" placeholder="Password" [(ngModel)]="loginPass" name="loginPass" required />
          <button type="submit" [disabled]="!loginNgForm.form.valid">Login</button>
        </form>
        <div *ngIf="loginError" class="exp-error">{{ loginError }}</div>
      </div>
    </ng-template>
  `,
  styles: [`
    .exp-container { max-width: 580px; margin: 30px auto; padding: 20px; border-radius: 8px; background: #fafafa; box-shadow: 0 2px 8px #eee;}
    h2, h3, h4 { text-align: center; }
    .exp-user { text-align: right; font-size: 13px; color: #555; margin-bottom: 6px;}
    .exp-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .exp-form input, .exp-form select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
    .exp-form button { align-self: flex-end; padding: 6px 16px; }
    .exp-filters { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; font-size: 14px;}
    .exp-filters label { font-size: 14px; }
    .exp-filters input[type="date"], .exp-filters input[type="month"], .exp-filters select { margin-left: 4px; }
    .exp-export { background: #64b5f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; padding: 4px 12px; }
    .exp-logout { background: #bbb; color: #fff; border: none; border-radius: 4px; cursor: pointer; padding: 4px 12px; }
    .exp-budget { margin: 18px 0 10px 0; }
    .exp-budget ul { list-style: none; padding: 0; margin: 0;}
    .exp-budget li { margin-bottom: 7px; font-size: 14px;}
    .exp-budget input { width: 70px; margin-left: 5px;}
    .exp-overbudget { color: #c00; margin-left: 10px; font-weight: bold;}
    .exp-notifications { margin: 12px 0;}
    .exp-note { background: #fffae6; border-left: 4px solid #ffd700; padding: 7px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 14px;}
    .exp-list ul { list-style: none; padding: 0; }
    .exp-list li { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .exp-list button { background: #e57373; color: #fff; border: none; border-radius: 4px; cursor: pointer; padding: 2px 10px;}
    .exp-total { font-weight: bold; margin-top: 12px; text-align: right; }
    .exp-login { max-width: 320px; margin: 60px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 24px;}
    .exp-login form { display: flex; flex-direction: column; gap: 10px;}
    .exp-login button { padding: 6px 16px; }
    .exp-error { color: #c00; margin-top: 10px; text-align: center;}
  `]
})
export class DailyExpencesComponent extends CommonExternalComponent {
  users: { [username: string]: string } = { 'demo': 'demo' };
  currentUser: string = '';
  loginUser: string = '';
  loginPass: string = '';
  loginError: string = '';

  categories: string[] = ['Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Other'];
  subcategories: { [cat: string]: string[] } = {
    'Food': ['Groceries', 'Dining Out', 'Snacks'],
    'Transport': ['Public Transit', 'Fuel', 'Taxi'],
    'Utilities': ['Electricity', 'Water', 'Internet', 'Phone'],
    'Shopping': ['Clothes', 'Electronics', 'Home'],
    'Entertainment': ['Movies', 'Games', 'Events'],
    'Other': ['Medical', 'Education', 'Misc']
  };

  expenses: Expense[] = [];
  newExpense: Expense = this.initExpense();

  filterDay: string = '';
  filterMonth: string = '';
  filterCategory: string = '';
  filterSubcategory: string = '';
  filteredExpenses: Expense[] = [];

  budgetLimits: BudgetLimit[] = [];
  notifications: string[] = [];

  constructor() {
    super();
    this.applyFilters();
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  login(): void {
    if (this.users[this.loginUser] === this.loginPass) {
      this.currentUser = this.loginUser;
      this.loginError = '';
      this.applyFilters();
      this.checkBudgets();
    } else {
      this.loginError = 'Invalid username or password.';
    }
  }

  logout(): void {
    this.currentUser = '';
    this.loginUser = '';
    this.loginPass = '';
    this.loginError = '';
    this.filteredExpenses = [];
    this.notifications = [];
  }

  addExpense(): void {
    if (!this.currentUser) return;

    const expense: Expense = {
      ...this.newExpense,
      id: Date.now(),
      user: this.currentUser
    };
    this.expenses.push(expense);

    // If recurring, generate future occurrences for current month
    if (expense.recurring && expense.recurrenceType) {
      const dates = this.generateRecurringDates(expense.date, expense.recurrenceType);
      for (const d of dates) {
        if (d !== expense.date) {
          this.expenses.push({
            ...expense,
            id: Date.now() + Math.random(),
            date: d
          });
        }
      }
    }

    this.newExpense = this.initExpense();
    this.applyFilters();
    this.checkBudgets();
  }

  deleteExpense(id: number): void {
    this.expenses = this.expenses.filter(exp => exp.id !== id || exp.user !== this.currentUser);
    this.applyFilters();
    this.checkBudgets();
  }

  applyFilters(): void {
    if (!this.currentUser) {
      this.filteredExpenses = [];
      return;
    }
    let exps = this.expenses.filter(exp => exp.user === this.currentUser);

    if (this.filterDay) {
      exps = exps.filter(exp => exp.date === this.filterDay);
    } else if (this.filterMonth) {
      exps = exps.filter(exp => exp.date.startsWith(this.filterMonth));
    }
    if (this.filterCategory) {
      exps = exps.filter(exp => exp.category === this.filterCategory);
    }
    if (this.filterSubcategory) {
      exps = exps.filter(exp => exp.subcategory === this.filterSubcategory);
    }
    this.filteredExpenses = [...exps];
    this.checkBudgets();
  }

  clearFilters(): void {
    this.filterDay = '';
    this.filterMonth = '';
    this.filterCategory = '';
    this.filterSubcategory = '';
    this.applyFilters();
  }

  updateSubcategories(): void {
    this.newExpense.subcategory = '';
  }

  allSubcategories(): string[] {
    if (this.filterCategory && this.subcategories[this.filterCategory]) {
      return this.subcategories[this.filterCategory];
    }
    const all: Set<string> = new Set();
    Object.values(this.subcategories).forEach(arr => arr.forEach(sub => all.add(sub)));
    return Array.from(all);
  }

  getFilteredTotal(): number {
    return this.filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  exportCSV(): void {
    if (!this.filteredExpenses.length) return;
    const header: string = 'Date,Description,Category,Subcategory,Amount,Recurring,RecurrenceType';
    const rows: string[] = this.filteredExpenses.map(exp =>
      `${exp.date},"${exp.description.replace(/"/g, '""')}","${exp.category.replace(/"/g, '""')}","${exp.subcategory.replace(/"/g, '""')}",${exp.amount.toFixed(2)},${exp.recurring ? 'Yes' : ''},${exp.recurrenceType || ''}`
    );
    const csvContent: string = [header, ...rows].join('\n');
    const blob: Blob = new Blob([csvContent], { type: 'text/csv' });
    const url: string = window.URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private initExpense(): Expense {
    return {
      id: 0,
      user: this.currentUser,
      description: '',
      amount: 0,
      category: '',
      subcategory: '',
      date: new Date().toISOString().slice(0, 10),
      recurring: false,
      recurrenceType: undefined
    };
  }

  // --- Recurring Expenses ---
  generateRecurringDates(startDate: string, recurrenceType: 'Daily' | 'Weekly' | 'Monthly'): string[] {
    const result: string[] = [];
    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth();
    let d = new Date(start);
    while (d.getFullYear() === year && d.getMonth() === month) {
      result.push(d.toISOString().slice(0, 10));
      if (recurrenceType === 'Daily') {
        d.setDate(d.getDate() + 1);
      } else if (recurrenceType === 'Weekly') {
        d.setDate(d.getDate() + 7);
      } else if (recurrenceType === 'Monthly') {
        break; // only the first occurrence in the month
      }
    }
    return result;
  }

  // --- Budget Limits ---
  getBudgetLimit(category: string): BudgetLimit {
    let b = this.budgetLimits.find(l => l.category === category && this.currentUser);
    if (!b) {
      b = { category, limit: 0 };
      this.budgetLimits.push(b);
    }
    return b;
  }

  setBudgetLimit(category: string, limit: number): void {
    let b = this.budgetLimits.find(l => l.category === category && this.currentUser);
    if (!b) {
      b = { category, limit: 0 };
      this.budgetLimits.push(b);
    }
    b.limit = limit;
    this.checkBudgets();
  }

  getCategoryTotal(category: string): number {
    return this.expenses
      .filter(e => e.user === this.currentUser && e.category === category && this.isInCurrentPeriod(e))
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // --- Notifications ---
  checkBudgets(): void {
    this.notifications = [];
    for (const cat of this.categories) {
      const limit = this.getBudgetLimit(cat).limit;
      if (limit > 0) {
        const spent = this.getCategoryTotal(cat);
        if (spent > limit) {
          this.notifications.push(`You have exceeded your budget for "${cat}" (Spent: $${spent.toFixed(2)}, Limit: $${limit.toFixed(2)}).`);
        } else if (spent > 0.9 * limit) {
          this.notifications.push(`Warning: Approaching budget limit for "${cat}" (Spent: $${spent.toFixed(2)}, Limit: $${limit.toFixed(2)}).`);
        }
      }
    }
  }

  isInCurrentPeriod(exp: Expense): boolean {
    // For budget checks, use current month/year or filtered month
    const period = this.filterMonth || new Date().toISOString().slice(0, 7);
    return exp.date.startsWith(period);
  }
}