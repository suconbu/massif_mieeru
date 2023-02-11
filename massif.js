class TextReader {
  constructor(input, newline) {
    this.text = input;
    this.pos = 0;
    this.newline = newline;
  }

  eof() {
    return this.text.length <= this.pos;
  }

  readTo(str) {
    const index = this.text.indexOf(str, this.pos);
    let result = "";
    if (0 <= index) {
      result = this.text.substring(this.pos, index);
      this.pos += result.length;
    }
    return result;
  }

  readLine() {
    const result = this.readTo(this.newline);
    this.pos += 1;
    return result;
  }

  readToEnd() {
    const result = this.text.substring(this.pos);
    this.pos = this.text.length;
    return result;
  }
}

class MassifAllocator {
  constructor(reader) {
    this.size = 0;
    this.addr = 0;
    this.func = "";
    this.sources = [];

    const line = reader.readLine();
    const match = line.match(/\s*n(\d+): (\d+) (?:(0x[0-9A-F]+): )?(.*)$/);
    if (!match) {
      throw Error(`unsupported format:${line}`);
    }
    const sourceCount = parseInt(match[1]);
    this.size = parseInt(match[2]);
    this.addr = match[3] ? parseInt(match[3]) : null;
    this.func = match[4];
    for (let i = 0; i < sourceCount; ++i) {
      const allocator = new MassifAllocator(reader);
      this.sources.push(allocator);
    }
  }
}

class MassifSnapshot {
  constructor(reader) {
    this.time = 0;
    this.heapSize = 0;
    this.heapExtraSize = 0;
    this.stackSize = 0;
    this.index = 0;
    this.isPeak = false;
    this.allocators = [];

    const header = reader.readTo("time=");
    const hmatch = header.match(/snapshot=(\d+)/);
    if (!hmatch) {
      throw Error(`unsupported format:${header}`);
    }
    this.index = parseInt(hmatch[1]);

    const body = reader.readTo("#-----------") || reader.readToEnd();
    const bmatch = body && body.match(/time=(\d+)\nmem_heap_B=(\d+)\nmem_heap_extra_B=(\d+)\nmem_stacks_B=(\d+)\nheap_tree=(\w+)\n/);
    if (!bmatch) {
      throw Error(`unsupported format:${s}`);
    }
    this.time = parseInt(bmatch[1]);
    this.heapSize = parseInt(bmatch[2]);
    this.heapExtraSize = parseInt(bmatch[3]);
    this.stackSize = parseInt(bmatch[4]);
    const type = bmatch[5];
    if (type != "empty") {
      if (type == "peak") {
        this.isPeak = true;
      }
      const allocinfo = new TextReader(body.substring(bmatch[0].length), reader.newline);
      while (!allocinfo.eof()) {
        this.allocators.push(new MassifAllocator(allocinfo));
      }
    }
  }
}

class Massif {
  constructor(reader) {
    this.option = null;
    this.command = null;
    this.timeUnit = null;
    this.snapshots = [];
    this.peakIndex = null;

    const s = reader.readTo("#-----------");
    const match = s && s.match(/desc: (.+)\ncmd: (.+)\ntime_unit: (.+)\n/);
    if (!match) {
      throw Error(`unsupported format:${s}`);
    }
    this.option = match[1];
    this.command = match[2];
    this.timeUnit = match[3];
    while(!reader.eof()) {
      try {
        const snapshot = new MassifSnapshot(reader);
        if (snapshot.isPeak) {
          this.peakIndex = this.snapshots.length;
        }
        this.snapshots.push(snapshot);
      } catch (ex) {
        console.error(ex);
      }
    }
  }
}
