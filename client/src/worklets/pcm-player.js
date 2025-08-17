class PCMPlayer extends AudioWorkletProcessor{
  constructor(){ super(); this.queue=[]; this.readPtr=0; this.current=null;
    this.port.onmessage=(e)=>{ if(e.data?.type==='enqueue'&&e.data.buffer){ this.queue.push(new Int16Array(e.data.buffer)); }
      else if(e.data?.type==='flush'){ this.queue.length=0; this.readPtr=0; this.current=null; } }; }
  process(_i,o){ const out=o[0][0]; if(!out) return true; for(let i=0;i<out.length;i++){ if(!this.current||this.readPtr>=this.current.length){ this.current=this.queue.shift(); this.readPtr=0; if(!this.current){ out[i]=0; continue; } }
      const s=this.current[this.readPtr++]/0x7fff; out[i]=s; } return true; } }
registerProcessor('pcm-player',PCMPlayer);