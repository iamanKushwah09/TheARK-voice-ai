export async function setupAudioGraph(){
  const audio=new AudioContext({sampleRate:48000});
  await audio.audioWorklet.addModule('/src/worklets/pcm-downsampler.js');
  await audio.audioWorklet.addModule('/src/worklets/pcm-player.js');
  const playerNode=new AudioWorkletNode(audio,'pcm-player'); playerNode.connect(audio.destination);
  return {audio, playerNode};
}
export function createDownsampler(audio,onChunk){
  const node=new AudioWorkletNode(audio,'pcm-downsampler',{processorOptions:{targetSampleRate:16000}});
  node.port.onmessage=(e)=>{ if(e.data?.type==='pcm16') onChunk(e.data.buffer); };
  return node;
}