class PCMDownsampler extends AudioWorkletProcessor{
  constructor(options){ super(); this.targetRate=options.processorOptions?.targetSampleRate||16000; this._ratio=sampleRate/this.targetRate; }
  process(inputs){ const ch0=inputs[0][0]; if(!ch0) return true; const outLen=Math.floor(ch0.length/this._ratio); const pcm=new Int16Array(outLen);
    let i=0,j=0; while(i<outLen){ const idx=Math.floor(j); const s=Math.max(-1,Math.min(1,ch0[idx]||0)); pcm[i++]=s*0x7fff; j+=this._ratio; }
    this.port.postMessage({type:'pcm16',buffer:pcm.buffer},[pcm.buffer]); return true; } }
registerProcessor('pcm-downsampler',PCMDownsampler);