import net from 'net'
/**
 *
 * @param port
 * @returns
 */
export const isPortTaken = async port => {
  return new Promise(resolve => {
    const tester = net
      .createServer()
      .once('error', () => resolve(true))
      .once('listening', () =>
        tester.once('close', () => resolve(false)).close()
      )
      .listen(port)
  })
}
 