import React from 'react'
import ReactDOM from 'react-dom/client'
import { HardwareSimulator } from '../components/HardwareSimulator'
import '../index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HardwareSimulator />
  </React.StrictMode>,
)
