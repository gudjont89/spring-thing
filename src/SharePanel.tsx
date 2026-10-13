import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Button, Sketch, TextInput } from './Sketch'

export function SharePanel({ url }: { url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 480 }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="card sketched share">
      <Sketch fill="solid" />
      <h2>Share this poll</h2>
      <p>Anyone with the link or QR code can vote. No sign-in needed.</p>
      <div className="option-row">
        <TextInput value={url} readOnly onFocus={(event) => event.target.select()} aria-label="Poll link" />
        <Button type="button" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      {qrDataUrl && <img className="qr" src={qrDataUrl} alt="QR code linking to this poll" />}
    </section>
  )
}
