import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonExternalComponent } from '../common-external/common-external.component';

/*
  Split-Spendings Component

  Features:
  - Input total spending amount and payer (team mate who paid)
  - Add team mates to split between
  - Choose equal or partial (custom) split
  - Enter custom contribution for each member if partial
  - Shows calculated individual contributions
*/

@Component({
  selector: 'app-split-spendings',
  template: `
    <div class="split-container" [formGroup]="spendForm">
      <h2>Split Spendings</h2>
      <label>
        Total Amount:
        <input type="number" formControlName="amount" min="0" required />
      </label>
      <label>
        Paid by:
        <select formControlName="payer">
          <option *ngFor="let member of members.controls; let i = index" [value]="member.value.name">{{member.value.name}}</option>
        </select>
      </label>
      <div class="members-list">
        <label>Add Team Mate:</label>
        <input [(ngModel)]="newMember" placeholder="Name" (keyup.enter)="addMember()" />
        <button type="button" (click)="addMember()">Add</button>
        <ul>
          <li *ngFor="let member of members.controls; let i = index">
            {{member.value.name}}
            <button type="button" (click)="removeMember(i)">Remove</button>
          </li>
        </ul>
      </div>
      <label>
        Split Type:
        <select formControlName="splitType">
          <option value="equal">Equally</option>
          <option value="partial">Partially</option>
        </select>
      </label>
      <div *ngIf="spendForm.get('splitType')?.value === 'partial'">
        <div *ngFor="let member of members.controls; let i = index">
          <label>
            {{member.value.name}}'s Contribution:
            <input type="number"
                   [formControl]="contributions.at(i)"
                   min="0"
                   [max]="spendForm.value.amount"
                   required />
          </label>
        </div>
        <div *ngIf="partialTotal !== spendForm.value.amount" class="error">
          Sum of contributions must equal total amount.
        </div>
      </div>
      <div *ngIf="spendForm.valid && canCalculate()">
        <h3>Individual Contributions:</h3>
        <ul>
          <li *ngFor="let member of members.controls; let i = index">
            {{member.value.name}}:
            <strong>
              {{
                spendForm.get('splitType')?.value === 'equal'
                  ? equalShare
                  : contributions.at(i).value
              | number:'1.2-2'}}
            </strong>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .split-container { max-width: 420px; margin: 20px auto; padding: 18px; border: 1px solid #ccc; border-radius: 8px; background: #f9f9f9;}
    label { display: block; margin-top: 12px; }
    input[type="number"], select, input[type="text"] { width: 100%; padding: 6px; margin-top: 4px; box-sizing: border-box;}
    .members-list ul { list-style: none; padding-left: 0; }
    .members-list li { display: flex; align-items: center; margin-bottom: 4px;}
    .members-list button { margin-left: 8px; }
    .error { color: #b71c1c; font-size: 0.95em; margin-top: 6px;}
    h2, h3 { margin-bottom: 10px; }
  `]
})
export class SplitSpendingsComponent extends CommonExternalComponent {
  spendForm: FormGroup;
  newMember: string = '';

  constructor(private fb: FormBuilder) {
    super();
    this.spendForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      payer: ['', Validators.required],
      splitType: ['equal', Validators.required],
      members: this.fb.array([]),
      contributions: this.fb.array([])
    });
    // Add two default members for usability
    this.addMemberWithName('Alice');
    this.addMemberWithName('Bob');
    this.spendForm.get('splitType')?.valueChanges.subscribe(type => {
      if (type === 'equal') this.setEqualContributions();
    });
    this.members.valueChanges.subscribe(() => this.syncContributions());
  }

  get members(): FormArray {
    return this.spendForm.get('members') as FormArray;
  }

  get contributions(): FormArray {
    return this.spendForm.get('contributions') as FormArray;
  }

  addMember(): void {
    const name = this.newMember.trim();
    if (name && !this.members.value.some((m: any) => m.name === name)) {
      this.addMemberWithName(name);
      this.newMember = '';
    }
  }

  addMemberWithName(name: string): void {
    this.members.push(this.fb.group({ name: [name, Validators.required] }));
    this.contributions.push(this.fb.control(0, [Validators.required, Validators.min(0)]));
    if (!this.spendForm.get('payer')?.value) {
      this.spendForm.get('payer')?.setValue(name);
    }
    this.setEqualContributions();
  }

  removeMember(index: number): void {
    this.members.removeAt(index);
    this.contributions.removeAt(index);
    this.setEqualContributions();
    if (this.members.length === 0) {
      this.spendForm.get('payer')?.setValue('');
    }
  }

  setEqualContributions(): void {
    const amt: number = Number(this.spendForm.value.amount || 0);
    const count: number = this.members.length;
    if (count > 0 && amt > 0) {
      const share: number = +(amt / count).toFixed(2);
      for (let i = 0; i < count; i++) {
        this.contributions.at(i).setValue(share, { emitEvent: false });
      }
    } else {
      for (let i = 0; i < this.contributions.length; i++) {
        this.contributions.at(i).setValue(0, { emitEvent: false });
      }
    }
  }

  syncContributions(): void {
    while (this.contributions.length < this.members.length) {
      this.contributions.push(this.fb.control(0, [Validators.required, Validators.min(0)]));
    }
    while (this.contributions.length > this.members.length) {
      this.contributions.removeAt(this.contributions.length - 1);
    }
    if (this.spendForm.get('splitType')?.value === 'equal') {
      this.setEqualContributions();
    }
  }

  get equalShare(): number {
    const amt: number = Number(this.spendForm.value.amount || 0);
    const count: number = this.members.length;
    return count > 0 ? +(amt / count).toFixed(2) : 0;
  }

  get partialTotal(): number {
    return this.contributions.controls.reduce((acc, ctrl) => acc + Number(ctrl.value), 0);
  }

  canCalculate(): boolean {
    if (this.members.length === 0) return false;
    if (this.spendForm.get('splitType')?.value === 'equal') return true;
    return this.partialTotal === Number(this.spendForm.value.amount);
  }
}