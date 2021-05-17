import { Component } from '@angular/core';

import { MatSnackBar } from '@angular/material';

import * as bip32_ed25519 from '../js/bip32_ed25519.js';
import * as bip39 from '../js/bip39-browserified.js';
import * as nano from '../../node_modules/nanocurrency/dist/nanocurrency.cjs.js'; //'nanocurrency';

@Component({
  selector: 'app-root',
  template: `
    <div style="position:fixed; z-index: 10000; width:100%; height:100%; pointer-events: none;" fxLayout="row" fxLayoutAlign="center center" *ngIf="working">
      <mat-spinner [strokeWidth]="4"></mat-spinner>
    </div>
    <div class="mat-headline">Nano BIP32-Ed25519</div>
    <div style="overflow-wrap: break-word;word-break: break-all;">
      <div fxLayout="row wrap" fxLayoutAlign="start center" fxLayoutGap="5px">
        <mat-form-field fxFlex="1 0 auto">
          <textarea rows="3" matInput placeholder="Mnemonic representation" [(ngModel)]="properMasterSeedAsMnemonic" [readonly]="!canManuallyEnterMnemonic" [disabled]="!canManuallyEnterMnemonic" (keyup)="onMnemonicSeedKey($event)"></textarea>
        </mat-form-field>
      </div>
      <div fxLayout="row wrap" fxLayoutAlign="start center" fxLayoutGap="5px" style="">
      <mat-form-field fxFlex="1 0 auto">
      <input matInput placeholder="Indexes to check (0-x)" [(ngModel)]="amountToCheck" [disabled]="amountToCheckDisabled"/>
    </mat-form-field>
        <mat-form-field fxFlex="1 0 auto">
          <input matInput placeholder="Derivation path" [(ngModel)]="derivationPath" [readonly]="true" [disabled]="true"/>
        </mat-form-field>
        <mat-form-field fxFlex="1 0 auto">
          <input matInput placeholder="Hashing algorithm" value="BLAKE2b" [readonly]="true" [disabled]="true"/>
        </mat-form-field>
        <button fxFlex="0 0 300px" mat-raised-button color="basic" style="background-color: #5795f1;color: #ffffff;"
                (click)="searchAddresses()" [disabled]="working">Rescue Me!
        </button>
      </div>
      <div>
        <div class="mat-headline">Addresses with balance:</div>
        <div>
          <div fxFlex="1 0" class="mat-h4">Address</div>
          <div fxFlex="1 0" class="mat-h4">Balance</div>
          <div fxFlex="1 0" class="mat-h4">Private key</div>
        </div>
        <br>
        <div *ngFor="let result of addressesWithBalance">
          <div fxFlex="1 0" class="mat-h4" style="color: #32a852">{{result.address}}</div>
          <div fxFlex="1 0" class="mat-h4" style="color: #32a852"> {{result.balance}}</div>
          <div fxFlex="1 0" class="mat-h4" style="color: #32a852">{{result.privateKey}}</div>
        </div>
      </div>
      <div>
        <div class="mat-headline">Addresses without balance:</div>
        <div>
          <div fxFlex="1 0" class="mat-h4">Address</div>
          <div fxFlex="1 0" class="mat-h4">Balance</div>
          <div fxFlex="1 0" class="mat-h4">Private key</div>
        </div>  
        <div *ngFor="let result of addressesWithoutBalance">
          <div fxFlex="1 0" class="mat-h4" style="color: #a83238">{{result.address}}</div>
          <div fxFlex="1 0" class="mat-h4" style="color: #a83238"> {{result.balance}}</div>
          <div fxFlex="1 0" class="mat-h4" style="color: #a83238">{{result.privateKey}}</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public amountToCheck = 250;
  public amountToCheckDisabled = false;

  public working = false;
  public canManuallyEnterMnemonic = true;
  public properMasterSeedAsHex = '';
  public properMasterSeedAsUint8 = null;
  public properMasterSeedAsMnemonic = '';

  public derivationPathBASE = "44'/165'/0/";
  public derivationPath = "44'/165'/0/0";

  public chain = null;

  public child_index = null;

  public priv_child = null
  public priv_child_key = null
  public priv_child_key_hex = null
  public priv_child_key_left = null
  public priv_child_key_left_hex = null
  public priv_child_key_right = null
  public priv_child_key_right_hex = null

  public pub_child = null
  public pub_child_key = null
  public pub_child_key_hex = null

  public nano_account_addr_from_pub_child_key = null;

  public addressesWithBalance = [];
  public addressesWithoutBalance = [];

  constructor(public snackBar: MatSnackBar) {
  }

  public generateProperMasterSeed() {
    this.properMasterSeedAsUint8 = bip32_ed25519.generate_proper_master_secret()
    this.properMasterSeedAsHex = bip32_ed25519.uint8ToHex(this.properMasterSeedAsUint8);
    //this.properMasterSeedAsMnemonic = bip39.entropyToMnemonic(this.properMasterSeedAsHex)

    if (this.nano_account_addr_from_pub_child_key) { // Update address and keys and ofther if they were generated before
      this.generateKeysAndOther(null)
    }
  }

  public searchAddresses() {
    this.amountToCheckDisabled = true;
    for (let i = 0; i <= this.amountToCheck; i++) {
      setTimeout(async () => {
        await this.generateKeysAndOther(i);
      }, i * 500);
    }
  }

  public async checkBalance(address, privateKey) {
    const API_URL_BASE = 'https://proxy.nanos.cc/proxy/?action=account_balance&account=';
    const rawResponse = await fetch(API_URL_BASE + address);
    if (rawResponse.ok) {
      const response = await rawResponse.json();

      const balance = parseFloat(response.balance);
      const pending = parseFloat(response.pending);
      const totalBalance = balance + pending;

      const result = {
        address: address,
        balance: totalBalance.toString(),
        privateKey: privateKey,
      }

      if (result.balance != '0') {
        this.addressesWithBalance.unshift(result);
      }
      else {
        this.addressesWithoutBalance.unshift(result);
      }
    }
  }

  public async generateKeysAndOther(index) {
    if (index === null) return;
    this.derivationPath = this.derivationPathBASE + index;
    console.log(this.derivationPath);

    if (this.derivationPath.endsWith("'")) {
      this.snackBar.open('Hardened child public keys can not be derived from a parent public key.', null, { duration: 6000 });
      return;
    }

    if (!this.properMasterSeedAsUint8) {
      this.generateProperMasterSeed();
    }

    // Get index to deteremine which child of the parent node to obtain
    let indexOfLastSlash = this.derivationPath.lastIndexOf('/');
    this.child_index = this.derivationPath.substr(indexOfLastSlash + 1, this.derivationPath.length);

    let parentPath = this.derivationPath.substr(0, indexOfLastSlash)

    if (!(this.child_index >= 0)) {
      this.snackBar.open('Error in the derivation path entered.', null, { duration: 6000 });
      return;
    }

    this.chain = bip32_ed25519.derive_chain(this.properMasterSeedAsUint8, parentPath)
    if (this.chain) {
      this.priv_child = bip32_ed25519.private_child_key(this.chain, this.child_index)
      if (!this.priv_child) {
        this.snackBar.open('A bad/unsafe child node generated.', null, { duration: 10000 });
      } else {
        this.priv_child_key = new Uint8Array(64);
        this.priv_child_key.set(this.priv_child[0][0])
        this.priv_child_key.set(this.priv_child[0][1], 32)
        const privateKey = bip32_ed25519.uint8ToHex(this.priv_child_key);
        this.priv_child_key_hex = privateKey;
        this.priv_child_key_left = this.priv_child[0][0]
        this.priv_child_key_left_hex = bip32_ed25519.uint8ToHex(this.priv_child_key_left);
        this.priv_child_key_right = this.priv_child[0][1]
        this.priv_child_key_right_hex = bip32_ed25519.uint8ToHex(this.priv_child_key_right);
        this.pub_child = bip32_ed25519.safe_public_child_key(this.chain[1], this.chain[2], this.child_index, false)
        if (!this.pub_child) {
          this.snackBar.open('A bad/unsafe child node generated.', null, { duration: 10000 });
        } else {
          this.pub_child_key = this.pub_child[0];
          this.pub_child_key_hex = bip32_ed25519.uint8ToHex(this.pub_child_key);
          const address = nano.deriveAddress(this.pub_child_key_hex, { useNanoPrefix: true });
          this.nano_account_addr_from_pub_child_key = address
          await this.checkBalance(address, privateKey);
        }
      }
    }

  }

  public onMnemonicSeedKey(event) {
    if (this.properMasterSeedAsMnemonic.split(' ').length == 24) {
      try {
        this.properMasterSeedAsHex = bip39.mnemonicToEntropy(this.properMasterSeedAsMnemonic).toUpperCase();
        this.properMasterSeedAsUint8 = bip32_ed25519.hexToUint8(this.properMasterSeedAsHex);
        this.generateKeysAndOther(null);
      } catch (err) {
        this.snackBar.open(err.message, null, { duration: 5000 });
        return;
      }
    } else {
      this.properMasterSeedAsHex = null;
      this.properMasterSeedAsUint8 = null;
    }
  }
}