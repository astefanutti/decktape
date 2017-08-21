class BufferReader {

  constructor(buffer) {
    this.rposition = 0;
    this.buffer = buffer;
  }

  read(inAmount) {
    const arr = [];
    const amount = this.rposition + inAmount;
    if (amount > this.buffer.length) {
      amount = this.buffer.length - this.rposition;
    }
    for (let i = this.rposition; i < amount; ++i)
      arr.push(this.buffer[i]);
    this.rposition = amount;
    return arr;
  }

  notEnded() {
    return this.rposition < this.buffer.length;
  }

  setPosition(inPosition) {
    this.rposition = inPosition;
  }

  setPositionFromEnd(inPosition) {
    this.rposition = this.buffer.length - inPosition;
  }

  skip(inAmount) {
    this.rposition += inAmount;
  }

  getCurrentPosition() {
    return this.rposition;
  }

  close() {
  }
}

module.exports = BufferReader;
