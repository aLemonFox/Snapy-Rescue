import { Component } from '@angular/core';

import {
  MatInputModule,
  MatSnackBar
} from '@angular/material';


import * as ed25519 from '../js/ed25519.js';
import * as bip32_ed25519 from '../js/bip32_ed25519.js';
import * as bip39 from '../js/bip39-browserified.js';
import * as nano from '../../node_modules/nanocurrency/dist/nanocurrency.cjs.js';//'nanocurrency';

import * as nano_pow from '../js/nano-pow/startThreads.js';

import { Decimal } from 'decimal.js';

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
  public shouldStop = false;

  public working = false;
  public canManuallyEnterSeed = false;
  public canManuallyEnterMnemonic = true;
  public properMasterSeedAsHex = '';
  public properMasterSeedAsUint8 = null;
  public properMasterSeedAsMnemonic = '';

  public derivationPathBASE = "44'/165'/0/";
  public derivationPath = "44'/165'/0/0";
  public parentPath = null;

  public chain = null;

  public parent_priv_key = null;
  public parent_priv_key_hex = null;
  public parent_priv_key_left = null;
  public parent_priv_key_left_hex = null;
  public parent_priv_key_right = null;
  public parent_priv_key_right_hex = null;
  public parent_pub_key = null;
  public parent_pub_key_hex = null;
  public parent_chain_code = null;
  public parent_chain_code_hex = null;

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

  public type_of_the_example_block = "open";
  public example_block_hash = null;
  public example_block_prev = null;
  public example_block_rep = 'nano_1ninja7rh37ehfp9utkor5ixmxyg8kme8fnzc4zty145ibch8kf5jwpnzr3r';
  public example_block_link = null;
  public example_block_sig = null;
  public example_block_work = null;

  public nano_account_cur_bal = '0.000001';
  public nano_account_amount_to_open_with = '0.000001';
  public nano_account_amount_to_send_or_receive = '0.000001';

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
    const searchAmount = 250;
    for (let i = 0; i < searchAmount; i++) {
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
      this.nullOutParentAndChildNodeData();
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
      this.nullOutParentAndChildNodeData();
      return;
    }

    this.chain = bip32_ed25519.derive_chain(this.properMasterSeedAsUint8, parentPath)
    if (!this.chain) {
      this.snackBar.open('Bad/unsafe node generated along the derivation chain.', null, { duration: 6000 });
      this.nullOutParentAndChildNodeData();
    } else {
      this.parent_priv_key = new Uint8Array(64);
      this.parent_priv_key.set(this.chain[0][0])
      this.parent_priv_key.set(this.chain[0][1], 32)
      this.parent_priv_key_hex = bip32_ed25519.uint8ToHex(this.parent_priv_key);
      this.parent_priv_key_left = this.chain[0][0]
      this.parent_priv_key_left_hex = bip32_ed25519.uint8ToHex(this.parent_priv_key_left);
      this.parent_priv_key_right = this.chain[0][1]
      this.parent_priv_key_right_hex = bip32_ed25519.uint8ToHex(this.parent_priv_key_right);
      this.parent_pub_key = this.chain[1]
      this.parent_pub_key_hex = bip32_ed25519.uint8ToHex(this.chain[1])
      this.parent_chain_code = this.chain[2]
      this.parent_chain_code_hex = bip32_ed25519.uint8ToHex(this.parent_chain_code)
    }

    if (this.chain) {
      this.priv_child = bip32_ed25519.private_child_key(this.chain, this.child_index)
      if (!this.priv_child) {
        this.snackBar.open('A bad/unsafe child node generated.', null, { duration: 10000 });
        this.nullOutChildNodeData();
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
          this.nullOutChildNodeData()
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

  public completelyFillExampleOpenBlock() {
    let that = this;

    if (
      !this.example_block_link ||
      (this.type_of_the_example_block != 'open' && !this.example_block_prev) ||
      (this.type_of_the_example_block == 'open' && !this.nano_account_cur_bal) ||
      ((this.type_of_the_example_block == 'send' || this.type_of_the_example_block == 'receive') && !this.nano_account_amount_to_send_or_receive)
    ) {
      this.snackBar.open('Some fields are empty or have invalid input', null, { duration: 5000 });
      return;
    }

    try {
      this.example_block_hash = nano.hashBlock({
        account: this.nano_account_addr_from_pub_child_key,
        previous: this.type_of_the_example_block == 'open' ? '0000000000000000000000000000000000000000000000000000000000000000' : this.example_block_prev,
        representative: this.example_block_rep,
        balance: this.example_block_bal(),
        link: this.example_block_link
      });
    } catch (err) {
      this.snackBar.open(err.message, null, { duration: 5000 });
      return;
    }

    let example_block_hash_uint8 = bip32_ed25519.hexToUint8(this.example_block_hash)

    let example_block_sig_uint8 = bip32_ed25519.special_signing(this.priv_child_key_left, this.priv_child_key_right, this.pub_child_key, example_block_hash_uint8);

    this.example_block_sig = bip32_ed25519.uint8ToHex(example_block_sig_uint8).toUpperCase();

    this.example_block_work = null;
    this.working = true;
    let hex_to_get_work_for = this.type_of_the_example_block == 'open' ? this.pub_child_key_hex : this.example_block_prev;
    this.getWork(hex_to_get_work_for, function (work, hex, fromCache) {
      that.working = false;
      that.example_block_work = work.toUpperCase();
      that.snackBar.open(fromCache ? 'Retrieved PoW from cache.' : 'Proof of work found!', null, { duration: 7000 });

    })
  }

  public getWork(hex = null, workCallback = null) {
    let that = this;

    if (hex && localStorage.getItem(hex) && workCallback) {
      workCallback(localStorage.getItem(hex), hex, true);
      return;
    }

    let NUM_THREADS;

    if (self.navigator.hardwareConcurrency) {
      NUM_THREADS = self.navigator.hardwareConcurrency;
    } else {
      NUM_THREADS = 4;
    }

    let np = nano_pow;
    let workers = nano_pow.pow_initiate(NUM_THREADS, 'js/nano-pow/');

    nano_pow.pow_callback(workers, hex, function () {
    }, function (work) {
      localStorage.setItem(hex, work);
      if (workCallback) workCallback(work, hex);
    });
  }

  public onMasterSeedKey(event) {
    if (this.properMasterSeedAsHex.length == 64) {
      try {
        //this.properMasterSeedAsMnemonic = bip39.entropyToMnemonic(this.properMasterSeedAsHex);
        this.properMasterSeedAsUint8 = bip32_ed25519.hexToUint8(this.properMasterSeedAsHex);
        this.generateKeysAndOther(null);
      } catch (err) {
        this.snackBar.open(err.message, null, { duration: 5000 });
        return;
      }
    } else {
      this.properMasterSeedAsMnemonic = null;
      this.properMasterSeedAsUint8 = null;
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

  public nanoToRaw(amount) {
    if (amount === 0 || amount === '0')
      return "0";
    else {
      try {
        let amountAsDecimal = new Decimal(amount.toString())
        let absoluteVal = nano.convert(amountAsDecimal.absoluteValue().toFixed(), { from: 'Nano', to: 'raw' }).toString();
        return (amountAsDecimal.isNegative() ? '-' : '') + absoluteVal;
      } catch (err) {
        return '[error]';
      }
    }
  }

  public example_block_bal() {
    let amount_to_open_with = parseFloat(this.nano_account_amount_to_open_with);
    let current_balance = parseFloat(this.nano_account_cur_bal);
    let amount_to_send_or_receive = parseFloat(this.nano_account_amount_to_send_or_receive);
    if (this.type_of_the_example_block == 'open') {
      if (amount_to_open_with < 0)
        return 'invalid value entered'
      else
        return this.nanoToRaw(parseFloat(this.nano_account_amount_to_open_with))
    } else if (this.type_of_the_example_block == 'send') {
      if (current_balance < 0 || amount_to_send_or_receive < 0 || current_balance - amount_to_send_or_receive < 0)
        return 'invalid values entered'
      else
        return this.nanoToRaw(parseFloat(this.nano_account_cur_bal) - parseFloat(this.nano_account_amount_to_send_or_receive));
    } else if (this.type_of_the_example_block == 'receive') {
      if (current_balance < 0 || amount_to_send_or_receive < 0)
        return 'invalid values entered'
      else
        return this.nanoToRaw(parseFloat(this.nano_account_cur_bal) + parseFloat(this.nano_account_amount_to_send_or_receive));
    }
  }

  public nullOutParentAndChildNodeData() {

    this.parent_priv_key = null;
    this.parent_priv_key_hex = null;
    this.parent_priv_key_left = null;
    this.parent_priv_key_left_hex = null;
    this.parent_priv_key_right = null;
    this.parent_priv_key_right_hex = null;
    this.parent_pub_key = null;
    this.parent_pub_key_hex = null;
    this.parent_chain_code = null;
    this.parent_chain_code_hex = null;

    this.nullOutChildNodeData();
  }

  public nullOutChildNodeData() {
    this.priv_child_key = null;
    this.priv_child_key_hex = null;
    this.priv_child_key_left = null;
    this.priv_child_key_left_hex = null;
    this.priv_child_key_right = null;
    this.priv_child_key_right_hex = null;

    this.pub_child_key = null;
    this.pub_child_key_hex = null;
    this.nano_account_addr_from_pub_child_key = null;

  }
}