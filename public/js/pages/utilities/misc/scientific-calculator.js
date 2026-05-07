const $display = $('#display');
const $memValue = $('#memValue');

let memory = 0;
let isDeg = true; // DEG by default

const toSafeNumber = (v) => {
  if (v === Infinity || v === -Infinity || Number.isNaN(v)) return v;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};

$(function () {
  window.appendDisplay = (val) => {
    if ($display.val() === '0' && val !== '.') $display.val('');
    $display.val($display.val() + val);
  };

  window.clearDisplay = () => {
    $display.val('0');
  };

  window.backspace = () => {
    $display.val($display.val().slice(0, -1) || '0');
  };

  window.toggleSign = () => {
    $display.val($display.val().startsWith('-') ? $display.val().slice(1) : '-' + $display.val());
  };

  window.toggleMode = () => {
    isDeg = !isDeg;
    $('#modeBtn').text(isDeg ? 'DEG' : 'RAD');
  };

  // Memory functions
  const updateMemUI = () => {
    if ($memValue && $memValue.length) {
      $memValue.val(memory !== 0 ? String(memory) : '');
    }
    $('#memIndicator').text(memory !== 0 ? 'M' : '');
  };

  window.memClear = () => { memory = 0; updateMemUI(); };
  window.memRecall = () => { $display.val(String(memory)); };
  window.memAdd = () => { memory += Number($display.val()) || 0; updateMemUI(); };
  window.memSub = () => { memory -= Number($display.val()) || 0; updateMemUI(); };

  window.calculate = () => {
    try {
      let expr = $display.val();

      if (typeof expr !== 'string') expr = String(expr || '');
      expr = expr.trim();

      // Normalize common constants (π / pi)
      expr = expr.replace(/π/g, 'PI');
      expr = expr.replace(/\bpi\b/gi, 'PI');

      // Normalize some visual tokens
      expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\u221A/g, 'sqrt');

      // Convert postfix factorial n! -> fact(n)
      // 1) simple numbers
      expr = expr.replace(/(\d+(?:\.\d+)?)!/g, 'fact($1)');
      // 2) parentheses: replace (inner)! iteratively from inner-most
      let parenFactRegex = /\(([^()]+)\)!/;
      while (parenFactRegex.test(expr)) {
        expr = expr.replace(parenFactRegex, 'fact(($1))');
      }

      // Replace ^ with ** for exponentiation
      expr = expr.replace(/\^/g, '**');

      // sanitize: remove trailing '=' characters (user might have typed '=')
      expr = expr.replace(/=+$/g, '');
      // normalize unicode variants: minus sign U+2212 -> hyphen, non-breaking spaces
      expr = expr.replace(/\u2212/g, '-').replace(/\u00A0/g, ' ');
      // normalize common visual operators
      expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\u221A/g, 'sqrt');
      // remove whitespace inside expression
      expr = expr.replace(/\s+/g, '');
      // strip trailing operator characters like + - * / . ^
      while (/[+\-*/\.\^]$/.test(expr)) expr = expr.slice(0, -1);
      if (!expr) expr = '0';

      // Debug: show exactly what will be evaluated
      try { console.debug('Calculator: evaluating ->', expr); } catch (e) {}

      // Build helper functions aware of DEG/RAD
      const helpers = `"use strict";
        function sin(x){return ${isDeg} ? Math.sin(x*Math.PI/180) : Math.sin(x);} 
        function cos(x){return ${isDeg} ? Math.cos(x*Math.PI/180) : Math.cos(x);} 
        function tan(x){return ${isDeg} ? Math.tan(x*Math.PI/180) : Math.tan(x);} 
        function asin(x){return ${isDeg} ? Math.asin(x)*180/Math.PI : Math.asin(x);} 
        function acos(x){return ${isDeg} ? Math.acos(x)*180/Math.PI : Math.acos(x);} 
        function atan(x){return ${isDeg} ? Math.atan(x)*180/Math.PI : Math.atan(x);} 
        function sinh(x){return Math.sinh ? Math.sinh(x) : (Math.exp(x)-Math.exp(-x))/2;} 
        function cosh(x){return Math.cosh ? Math.cosh(x) : (Math.exp(x)+Math.exp(-x))/2;} 
        function tanh(x){return Math.tanh ? Math.tanh(x) : (Math.exp(x)-Math.exp(-x))/(Math.exp(x)+Math.exp(-x)));} 
        function log(x){return Math.log10 ? Math.log10(x) : Math.log(x)/Math.LN10;} 
        function ln(x){return Math.log(x);} 
        function sqrt(x){return Math.sqrt(x);} 
        function exp(x){return Math.exp(x);} 
        function pow(a,b){return Math.pow(a,b);} 
        function fact(n){ if(n<0) return NaN; if(n===0) return 1; let r=1; for(let i=1;i<=Math.floor(n);i++) r*=i; return r;} 
        const PI = Math.PI; const E = Math.E; 
      `;

      const code = helpers + '\nreturn (' + expr + ')';
      const result = Function(code)();
      $display.val(String(toSafeNumber(result)));
    } catch (err) {
      console.error('Calculator error evaluating expression', err);
      try { console.debug('Expression:', $display.val()); } catch (e) {}
      $display.val('Error');
      $display.attr('title', err && err.message ? err.message : 'Calculation error');
    }
  };

  // expose some helpers to window (for onclick attrs)
  window.toggleMode = window.toggleMode;
  window.memClear = window.memClear;
  window.memRecall = window.memRecall;
  window.memAdd = window.memAdd;
  window.memSub = window.memSub;
  window.appendDisplay = window.appendDisplay;
  window.clearDisplay = window.clearDisplay;
  window.backspace = window.backspace;
  window.toggleSign = window.toggleSign;
  window.calculate = window.calculate;
  // initialize mem UI
  updateMemUI();
});
