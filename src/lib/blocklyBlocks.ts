import Blockly from "blockly";

/* ── colour palette (matches our design tokens roughly) ── */
const C = {
  trade: 160,
  condition: 210,
  market: 30,
  math: 270,
  logic: 340,
  loop: 120,
};

/* ══════════════════════════════════════════════════════════
   CUSTOM BLOCKS
   ══════════════════════════════════════════════════════════ */

// ─── Trade actions ───
Blockly.Blocks["trade_buy"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField("Buy")
      .appendField(
        new Blockly.FieldDropdown([
          ["DIGIT OVER", "DIGITOVER"],
          ["DIGIT UNDER", "DIGITUNDER"],
          ["DIGIT EVEN", "DIGITEVEN"],
          ["DIGIT ODD", "DIGITODD"],
        ]),
        "CONTRACT"
      );
    this.appendValueInput("PREDICTION").setCheck("Number").appendField("prediction");
    this.appendValueInput("STAKE").setCheck("Number").appendField("stake $");
    this.appendValueInput("SYMBOL").setCheck("String").appendField("on");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(C.trade);
    this.setTooltip("Place a digit trade on Deriv");
  },
};

Blockly.Blocks["trade_sell"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Sell open contract");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(C.trade);
  },
};

// ─── Market / symbol ───
Blockly.Blocks["market_symbol"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField("Market")
      .appendField(
        new Blockly.FieldDropdown([
          ["Volatility 10", "R_10"],
          ["Volatility 10 (1s)", "1HZ10V"],
          ["Volatility 25", "R_25"],
          ["Volatility 25 (1s)", "1HZ25V"],
          ["Volatility 50", "R_50"],
          ["Volatility 50 (1s)", "1HZ50V"],
          ["Volatility 75", "R_75"],
          ["Volatility 75 (1s)", "1HZ75V"],
          ["Volatility 100", "R_100"],
          ["Volatility 100 (1s)", "1HZ100V"],
        ]),
        "SYMBOL"
      );
    this.setOutput(true, "String");
    this.setColour(C.market);
    this.setTooltip("Select a volatility market");
  },
};

// ─── Conditions ───
Blockly.Blocks["last_digit"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Last digit");
    this.setOutput(true, "Number");
    this.setColour(C.condition);
    this.setTooltip("The last digit of the most recent tick");
  },
};

Blockly.Blocks["tick_count"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Tick count");
    this.setOutput(true, "Number");
    this.setColour(C.condition);
  },
};

Blockly.Blocks["current_profit"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Current profit");
    this.setOutput(true, "Number");
    this.setColour(C.condition);
  },
};

Blockly.Blocks["total_profit"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Total profit");
    this.setOutput(true, "Number");
    this.setColour(C.condition);
  },
};

Blockly.Blocks["digit_is"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("DIGIT").setCheck("Number").appendField("digit");
    this.appendDummyInput()
      .appendField("is")
      .appendField(
        new Blockly.FieldDropdown([
          ["even", "EVEN"],
          ["odd", "ODD"],
          ["over 5", "OVER5"],
          ["under 5", "UNDER5"],
        ]),
        "CHECK"
      );
    this.setOutput(true, "Boolean");
    this.setColour(C.condition);
  },
};

Blockly.Blocks["consecutive_digits"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("COUNT").setCheck("Number").appendField("Last");
    this.appendDummyInput()
      .appendField("digits all")
      .appendField(
        new Blockly.FieldDropdown([
          ["even", "EVEN"],
          ["odd", "ODD"],
          ["over 5", "OVER5"],
          ["under 5", "UNDER5"],
        ]),
        "PATTERN"
      );
    this.setOutput(true, "Boolean");
    this.setColour(C.condition);
    this.setTooltip("Check if the last N digits all match a pattern");
  },
};

// ─── Stake management ───
Blockly.Blocks["martingale"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("BASE").setCheck("Number").appendField("Martingale base $");
    this.appendValueInput("MULTIPLIER").setCheck("Number").appendField("× multiplier");
    this.setOutput(true, "Number");
    this.setColour(C.math);
    this.setTooltip("Calculate next stake using martingale");
  },
};

Blockly.Blocks["reset_stake"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Reset stake to initial");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(C.trade);
  },
};

// ─── Control ───
Blockly.Blocks["wait_for_tick"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("Wait for next tick");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(C.loop);
  },
};

Blockly.Blocks["stop_bot"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput().appendField("🛑 Stop bot");
    this.setPreviousStatement(true, null);
    this.setColour(C.trade);
  },
};

Blockly.Blocks["trade_result"] = {
  init(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField("Last trade was")
      .appendField(
        new Blockly.FieldDropdown([
          ["win", "WIN"],
          ["loss", "LOSS"],
        ]),
        "RESULT"
      );
    this.setOutput(true, "Boolean");
    this.setColour(C.condition);
  },
};

Blockly.Blocks["log_message"] = {
  init(this: Blockly.Block) {
    this.appendValueInput("MSG").appendField("Log");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(C.loop);
  },
};

/* ══════════════════════════════════════════════════════════
   TOOLBOX XML
   ══════════════════════════════════════════════════════════ */
export const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Trade",
      colour: `${C.trade}`,
      contents: [
        { kind: "block", type: "trade_buy" },
        { kind: "block", type: "trade_sell" },
        { kind: "block", type: "reset_stake" },
        { kind: "block", type: "stop_bot" },
      ],
    },
    {
      kind: "category",
      name: "Market",
      colour: `${C.market}`,
      contents: [{ kind: "block", type: "market_symbol" }],
    },
    {
      kind: "category",
      name: "Conditions",
      colour: `${C.condition}`,
      contents: [
        { kind: "block", type: "last_digit" },
        { kind: "block", type: "tick_count" },
        { kind: "block", type: "current_profit" },
        { kind: "block", type: "total_profit" },
        { kind: "block", type: "digit_is" },
        { kind: "block", type: "consecutive_digits" },
        { kind: "block", type: "trade_result" },
      ],
    },
    {
      kind: "category",
      name: "Stake",
      colour: `${C.math}`,
      contents: [{ kind: "block", type: "martingale" }],
    },
    {
      kind: "category",
      name: "Control",
      colour: `${C.loop}`,
      contents: [
        { kind: "block", type: "wait_for_tick" },
        { kind: "block", type: "log_message" },
      ],
    },
    {
      kind: "category",
      name: "Logic",
      colour: `${C.logic}`,
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: `${C.math}`,
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_modulo" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      colour: `${C.loop}`,
      contents: [
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "controls_whileUntil" },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      colour: `${C.math}`,
      custom: "VARIABLE",
    },
  ],
};
