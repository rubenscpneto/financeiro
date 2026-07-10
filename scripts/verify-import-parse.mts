import { BlobWriter, TextReader, ZipWriter, configure } from '@zip.js/zip.js'
import { parseStatement } from '../src/lib/parsers/detect'

configure({ useWebWorkers: false })

const csv =
  'Data de Compra;Descrição;Categoria;Parcela;Valor (em R$)\n15/03/2026;PADARIA CENTRAL;Alimentação;Única;32,90\n16/03/2026;UBER TRIP;Transporte;Única;18,40\n'

async function makeZip(password: string) {
  const zw = new ZipWriter(new BlobWriter(), {
    password,
    encryptionStrength: 3,
  })
  await zw.add('fatura.csv', new TextReader(csv))
  const blob = await zw.close()
  return Buffer.from(await blob.arrayBuffer())
}

async function main() {
  const plain = await parseStatement({
    content: Buffer.from(csv),
    fileName: 'fatura.csv',
    sourceType: 'checking',
  })
  console.log('plain', plain.meta.parser, plain.transactions.length, plain.transactions[0]?.amount)

  const zip6 = await makeZip('123456')
  const unlocked6 = await parseStatement({
    content: zip6,
    fileName: 'fatura.zip',
    sourceType: 'credit_card',
    password: '123456',
  })
  console.log('zip6', unlocked6.meta.parser, unlocked6.transactions.length)

  const zip4 = await makeZip('1234')
  const unlocked4 = await parseStatement({
    content: zip4,
    fileName: 'fatura.csv',
    sourceType: 'credit_card',
    password: '1234',
  })
  console.log('zip4', unlocked4.meta.parser, unlocked4.transactions.length)

  try {
    await parseStatement({
      content: zip6,
      fileName: 'fatura.zip',
      sourceType: 'credit_card',
      password: '000000',
    })
    console.log('wrong-password FAIL')
  } catch (e) {
    console.log('wrong-password', e instanceof Error ? e.message : e)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
