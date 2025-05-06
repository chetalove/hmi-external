import { Component } from '@angular/core';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-daily-expense-tracker',
  template: `
    <div class="container">
      <h2>Daily Expense Tracker</h2>
      <form (ngSubmit)="addExpense()" #f="ngForm" class="exp-form">
        <input type="text" placeholder="Description" [(ngModel)]="desc" name="desc" required />
        <input type="number" placeholder="Amount" [(ngModel)]="amt" name="amt" required min="0.01" step="0.01"/>
        <select [(ngModel)]="cat" name="cat" required>
          <option value="" disabled selected>Select Category</option>
          <option *ngFor="let c of categories">{{c}}</option>
        </select>
        <input type="date" [(ngModel)]="dt" name="dt" required />
        <button type="submit" [disabled]="!f.form.valid">Add</button>
      </form>

      <div class="filters">
        <label>
          Day:
          <input type="date" [(ngModel)]="filterDay" (change)="applyFilters()" />
        </label>
        <label>
          Month:
          <input type="month" [(ngModel)]="filterMonth" (change)="applyFilters()" />
        </label>
        <button (click)="clearFilters()">Clear</button>
      </div>

      <ul>
        <li *ngFor="let e of filteredExpenses">
          {{e.date}} - {{e.description}} ({{e.category}}): ${{e.amount.toFixed(2)}}
          <button (click)="deleteExpense(e.id)">Delete</button>
        </li>
      </ul>
      <div>Total: ${{filteredExpenses.reduce((s,e)=>s+e.amount,0).toFixed(2)}}</div>

      <h3>Reports</h3>
      <canvas id="pie" width="350" height="220"></canvas>
      <canvas id="bar" width="350" height="220"></canvas>
    </div>
  `,
  styles: [`
    .container { max-width: 500px; margin: 30px auto; background: #fafafa; border-radius: 8px; padding: 20px;}
    .exp-form { display: flex; gap: 6px; margin-bottom: 12px;}
    .exp-form input, .exp-form select { padding: 5px;}
    ul { list-style: none; padding: 0;}
    li { margin-bottom: 4px;}
    button { margin-left: 8px;}
    .filters { display: flex; gap: 10px; margin-bottom: 10px;}
    canvas { display: block; margin: 18px auto;}
  `]
})
export class DailyExpenseTrackerComponent {
  categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Other'];
  expenses: Expense[] = [];
  desc = '';
  amt: number | null = null;
  cat = '';
  dt = new Date().toISOString().slice(0,10);

  filterDay = '';
  filterMonth = '';
  filteredExpenses: Expense[] = [];

  ngAfterViewInit() { this.applyFilters(); }

  addExpense() {
    if (!this.desc || !this.cat || !this.dt || !this.amt) return;
    this.expenses.push({
      id: Date.now(),
      description: this.desc,
      amount: +this.amt,
      category: this.cat,
      date: this.dt
    });
    this.desc = ''; this.amt = null; this.cat = '';
    this.dt = new Date().toISOString().slice(0,10);
    this.applyFilters();
  }

  deleteExpense(id: number) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.applyFilters();
  }

  applyFilters() {
    let exps = [...this.expenses];
    if (this.filterDay) exps = exps.filter(e => e.date === this.filterDay);
    else if (this.filterMonth) exps = exps.filter(e => e.date.startsWith(this.filterMonth));
    this.filteredExpenses = exps;
    setTimeout(() => this.drawCharts(), 50);
  }

  clearFilters() {
    this.filterDay = '';
    this.filterMonth = '';
    this.applyFilters();
  }

  drawCharts() {
    // Pie chart (category breakdown)
    const ctxPie = (document.getElementById('pie') as HTMLCanvasElement)?.getContext('2d');
    if (ctxPie) {
      ctxPie.clearRect(0,0,350,220);
      const cats = this.categories.map(c =>
        this.filteredExpenses.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)
      );
      const total = cats.reduce((a,b)=>a+b,0);
      let start = 0;
      const colors = ['#42a5f5','#66bb6a','#ffa726','#ab47bc','#ef5350'];
      cats.forEach((val,i) => {
        if (!val) return;
        const angle = (val/total)*2*Math.PI;
        ctxPie.beginPath();
        ctxPie.moveTo(175,110);
        ctxPie.arc(175,110,80,start,start+angle);
        ctxPie.closePath();
        ctxPie.fillStyle = colors[i%colors.length];
        ctxPie.fill();
        start += angle;
      });
      // Legend
      ctxPie.font = "13px Arial";
      let y=15;
      this.categories.forEach((c,i)=>{
        ctxPie.fillStyle = colors[i%colors.length];
        ctxPie.fillRect(10,y-10,12,12);
        ctxPie.fillStyle = "#222";
        ctxPie.fillText(`${c}: $${cats[i].toFixed(2)}`,28,y);
        y+=18;
      });
    }
    // Bar chart (daily/monthly total)
    const ctxBar = (document.getElementById('bar') as HTMLCanvasElement)?.getContext('2d');
    if (ctxBar) {
      ctxBar.clearRect(0,0,350,220);
      // Group by day or month
      const map = new Map<string,number>();
      for (const e of this.filteredExpenses) {
        const key = this.filterMonth ? e.date : e.date.slice(0,7);
        map.set(key, (map.get(key)||0)+e.amount);
      }
      const keys = Array.from(map.keys()).sort();
      const vals = keys.map(k=>map.get(k)||0);
      // Draw bars
      const max = Math.max(...vals,1);
      const w = 24, gap = 10;
      keys.forEach((k,i)=>{
        const h = 180*vals[i]/max;
        ctxBar.fillStyle = "#42a5f5";
        ctxBar.fillRect(30+i*(w+gap),200-h,w,h);
        ctxBar.fillStyle = "#222";
        ctxBar.font = "11px Arial";
        ctxBar.fillText(vals[i].toFixed(0),32+i*(w+gap),195-h);
        ctxBar.save();
        ctxBar.translate(36+i*(w+gap),210);
        ctxBar.rotate(-Math.PI/5);
        ctxBar.fillText(this.filterMonth?k:k.slice(5),0,0);
        ctxBar.restore();
      });
    }
  }
}