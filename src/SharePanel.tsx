import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Button, Sketch, TextInput } from './Sketch'

export function SharePanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="card sketched share">
      <Sketch />
      <h2>Share this poll</h2>
      <p>Anyone with the link or QR code can vote. No sign-in needed.</p>
      <div className="option-row">
        <TextInput value={url} readOnly onFocus={(event) => event.target.select()} aria-label="Poll link" />
        <Button type="button" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <QrCode url={url} />
    </section>
  )
}

export function QrCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 480 }).then((dataUrl) => {
      if (!cancelled) setDataUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return dataUrl && <img className="qr" src={dataUrl} alt="QR code linking to this poll" />
}
