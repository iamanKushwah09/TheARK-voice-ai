import React, { useEffect, useRef, useState } from 'react';
import { setupAudioGraph, createDownsampler } from './hooks/useAudioWorklets.js';
import logoUrl from './assets/logo.png';
const GATEWAY = import.meta.env.VITE_GATEWAY_URL || '';
export default function App(){
  const [status,setStatus]=useState('idle'); const [latency,setLatency]=useState(null); const [logs,setLogs]=useState([]); const [language,setLanguage]=useState('en');
  const wsRef=useRef(null), audioRef=useRef(null), downRef=useRef(null), playerRef=useRef(null), mediaStreamRef=useRef(null), lastCommitRef=useRef(0), firstAudioAfterCommitRef=useRef(false);
  useEffect(()=>{(async()=>{ const {audio,playerNode}=await setupAudioGraph(); audioRef.current=audio; playerRef.current=playerNode; log('Audio graph ready');
    const ws=new WebSocket(getWSURL()); ws.binaryType='arraybuffer'; ws.onopen=()=>{ log('Connected to The ARK gateway'); ws.send(JSON.stringify({type:'setLanguage',language})); };
    ws.onclose=()=>log('Gateway closed'); ws.onerror=()=>log('WS error'); ws.onmessage=(ev)=>{ if(typeof ev.data==='string'){ } else { if(firstAudioAfterCommitRef.current){ setLatency(Math.round(performance.now()-lastCommitRef.current)); firstAudioAfterCommitRef.current=false; }
      playerRef.current.port.postMessage({type:'enqueue',buffer:ev.data},[ev.data]); } }; wsRef.current=ws; })(); },[]);
  function getWSURL(){ if(GATEWAY) return GATEWAY; const proto=location.protocol==='https:'?'wss':'ws'; return `${proto}://${location.hostname}:8080/ws`; }
  function log(s){ setLogs(L=>[new Date().toLocaleTimeString()+'  '+s, ...L].slice(0,200)); }
  async function startRecording(){ if(status==='recording') return; setStatus('recording'); playerRef.current.port.postMessage({type:'flush'}); wsRef.current?.send(JSON.stringify({type:'interrupt'}));
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,sampleRate:48000}}); mediaStreamRef.current=stream; const src=audioRef.current.createMediaStreamSource(stream);
    const down=createDownsampler(audioRef.current,(buffer)=>{ wsRef.current?.send(buffer); }); downRef.current=down; src.connect(down); }
  async function stopRecording(){ if(status!=='recording') return; setStatus('thinking'); downRef.current?.disconnect(); mediaStreamRef.current?.getTracks().forEach(t=>t.stop()); mediaStreamRef.current=null;
    lastCommitRef.current=performance.now(); firstAudioAfterCommitRef.current=true; wsRef.current?.send(JSON.stringify({type:'commit'})); }
  function onLanguageChange(e){ const lang=e.target.value; setLanguage(lang); wsRef.current?.send(JSON.stringify({type:'setLanguage',language:lang})); log(`Language set to ${lang}`); }
  useEffect(()=>{ const d=e=>{ if(e.code==='Space'&&!e.repeat) startRecording(); }; const u=e=>{ if(e.code==='Space') stopRecording(); }; window.addEventListener('keydown',d); window.addEventListener('keyup',u);
    return ()=>{ window.removeEventListener('keydown',d); window.removeEventListener('keyup',u); }; },[status]);
  return (<div className='wrap'><div className='card'><div className='row' style={{justifyContent:'space-between'}}><div className='brand'><img src={logoUrl} alt='The ARK logo'/><div>
    <div className='title'>The ARK — Voice Bot</div><div className='subtitle'>Low-latency Gemini Live with barge-in & bilingual support</div></div></div>
    <div className='row'><label htmlFor='lang'>Language:</label><select id='lang' value={language} onChange={onLanguageChange}><option value='en'>English</option><option value='hi'>हिंदी</option><option value='mixed'>Hinglish</option></select></div></div>
    <p style={{marginTop:14}}>Hold <strong>Space</strong> or click & hold the mic to talk. Speak anytime to <em>barge-in</em>.</p>
    <div className='row' style={{gap:24,marginTop:16}}><button className={'mic '+(status==='recording'?'recording':'')} onMouseDown={startRecording} onMouseUp={stopRecording}
      onTouchStart={e=>{e.preventDefault();startRecording();}} onTouchEnd={e=>{e.preventDefault();stopRecording();}} aria-label='Push to talk'>🎤</button>
      <div className='pill'>Status: {status}</div><div className='pill'>Latency: {latency?`${latency} ms`:'—'}</div>
      <button className='primary' onClick={()=>playerRef.current.port.postMessage({type:'flush'})}>Flush Audio</button></div></div>
    <div className='card' style={{marginTop:20}}><h3>Logs</h3><div className='log'>{logs.map((l,i)=><div key={i}>{l}</div>)}</div><div className='footer'>Tip: Use headphones to avoid echo-triggered self interruptions.</div></div></div>); }