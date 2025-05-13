import { Component } from '@angular/core';
import { CommonExternalComponent } from '../common-external/common-external.component';

interface Expense {
  description: string;
  amount: number;
  date: Date;
}

@Component({
  selector: 'app-d',
  template: `
    <!-- Daily Expenses Tracker -->
    <div class="container">
      <h2>Monthly Balance: {{ balance | currency }}</h2>
      <form (ngSubmit)="addExpense()" #expenseForm="ngForm" class="expense-form">
        <input type="text" [(ngModel)]="newExpense.description" name="desc" placeholder="Description" required />
        <input type="number" [(ngModel)]="newExpense.amount" name="amt" placeholder="Amount" min="0.01" step="0.01" required />
        <input type="date" [(ngModel)]="newExpense.date" name="date" [max]="todayStr" required />
        <button type="submit" [disabled]="!expenseForm.form.valid">Add Expense</button>
      </form>

      <div class="setup-balance" *ngIf="monthlyStartAmount === null">
        <label>Set Monthly Amount for {{ monthName }}:</label>
        <input type="number" [(ngModel)]="startAmountInput" placeholder="Amount" min="1" />
        <button (click)="setMonthlyAmount()">Set</button>
      </div>

      <div *ngIf="expenses.length">
        <h3>Expenses This Month</h3>
        <ul>
          <li *ngFor="let exp of expenses">
            {{ exp.date | date:'MMM d' }} - {{ exp.description }}: {{ exp.amount | currency }}
          </li>
        </ul>
      </div>

      <div style="margin-top:20px;">
        <canvas baseChart 
          [datasets]="barChartData"
          [labels]="barChartLabels"
          [options]="barChartOptions"
          [legend]="false"
          chartType="bar">
        </canvas>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 500px; margin: auto; padding: 16px; background: #f7f7fa; border-radius: 8px; }
    h2, h3 { text-align: center; }
    .expense-form, .setup-balance { display: flex; gap: 8px; margin-bottom: 12px; }
    ul { list-style: none; padding: 0; }
    li { padding: 4px 0; }
    input[type="number"], input[type="text"], input[type="date"] { flex: 1; }
    button { flex-shrink: 0; }
  `]
})
export class DComponent extends CommonExternalComponent {
  expenses: Expense[] = [];
  newExpense: Expense = { description: '', amount: 0, date: new Date() };
  monthlyStartAmount: number | null = null;
  startAmountInput: number = 0;
  todayStr: string = new Date().toISOString().split('T')[0];

  get monthName(): string {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  get balance(): number {
    const spent = this.expenses.reduce((sum, e) => sum + e.amount, 0);
    return (this.monthlyStartAmount ?? 0) - spent;
  }

  addExpense(): void {
    if (!this.newExpense.description || !this.newExpense.amount || !this.newExpense.date) return;
    // Ensure expense is in current month
    const now = new Date();
    if (
      this.newExpense.date.getMonth() !== now.getMonth() ||
      this.newExpense.date.getFullYear() !== now.getFullYear()
    ) return;
    this.expenses.push({ ...this.newExpense, date: new Date(this.newExpense.date) });
    this.newExpense = { description: '', amount: 0, date: new Date() };
  }

  setMonthlyAmount(): void {
    if (this.startAmountInput > 0) {
      this.monthlyStartAmount = this.startAmountInput;
      this.startAmountInput = 0;
    }
  }

  // Chart.js data for bar chart by week and month
  get barChartLabels(): string[] {
    // Group by week number in current month
    const weeks = [1, 2, 3, 4, 5];
    return weeks.map(w => `Week ${w}`);
  }

  get barChartData(): any[] {
    const now = new Date();
    const weeksTotals: number[] = [0, 0, 0, 0, 0];
    for (const exp of this.expenses) {
      if (exp.date.getMonth() === now.getMonth() && exp.date.getFullYear() === now.getFullYear()) {
        const week = Math.floor((exp.date.getDate() - 1) / 7);
        weeksTotals[week] += exp.amount;
      }
    }
    return [{ data: weeksTotals, label: 'Expenses' }];
  }

  barChartOptions = {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  };
}

/*
Features:
- Set starting balance at the beginning of each month.
- Add multiple daily expenses with description, amount, and date.
- Shows remaining balance after expenses.
- Lists all expenses for the current month.
- Bar chart visualization of expenses per week using Chart.js.
*/