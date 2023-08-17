
// Imports ===========================================================

import Terminal from '../../terminal/terminal.js'
import LiveTerminal from '../../terminal/liveterminal.js'
import type * as E from '../events.js'

import cp, { StdioOptions } from 'child_process'

// Handlers =========================================================

interface ExecOptions extends Omit<cp.SpawnOptions, "stdio"> {
    stdio?: 'all' | 'none' | 'takeover'
}

function extractArgv(argv: string | string[]): [string, string[]] {
    const $argv = [...argv]
    return Array.isArray(argv) ? [$argv.shift()!, $argv] : [argv, []]
}

/**
 * Creates a child process when called.
 * This does NOT create a new child process that is manageable the same way the `cp` object allows to configure.
 */
export function spawn<Event extends E.SoybeanEvent = E.SoybeanEvent>(command: string | string[], settings: ExecOptions = {}): E.EventHandler<Event> {
    return (e) => new Promise<null | Error>(end => {

        const stdioOptions = {
            all: ['ignore', 'inherit', 'inherit'],      // aLl - All stdout/stderr is piped
            none: ['ignore', 'ignore', 'ignore'],       // none - All IO is ignored and the process is silent
            takeover: ['pipe', 'inherit', 'inherit']    // takeover - stdout/stderr inherited, stdin piped manually due to strange behavior.
        }

        const [cmd, spawnargs] = extractArgv(command)
        const log = e.source === 'task' ? Terminal.TASK : Terminal.INFO
        const lt = LiveTerminal.getLiveInstance()
        const stdio = stdioOptions[settings.stdio || 'all'] as StdioOptions

        if (!stdio) return end(Error(`spawn stdio must be one of: ${Object.keys(stdioOptions).map(x => `"${x}"`).join(', ')}.`))

        try {
            const child = cp.spawn(cmd, spawnargs, {
                ...settings,
                shell: settings.shell,
                stdio: stdio,
            })
            child.on('error', (error) => {
                log(`spawn error ("${[cmd, ...spawnargs].join(' ')}"), code: ${child.exitCode}`, error as any as string)
                lt.startInputCapture()
                child.kill()
                end(error as Error)
            })
            child.on('exit', () => {
                log(`spawn finished ("${[cmd, ...spawnargs].join(' ')}"), code: ${child.exitCode}`)
                lt.startInputCapture()
                end(null)
            })
            if (settings.stdio === 'takeover' && lt) {
                // Pipe STDIN manually to the process instead of inheriting it.
                // Automatic inheritance leads to strange behavior that causes
                // some keystrokes to be completely omitted, seemingly at random.
                process.stdin.pipe(child.stdin!)
                lt.stopInputCapture()
            }
        }
        catch (error) {
            settings.stdio === 'takeover' && lt && lt.startInputCapture()
            end(error as Error)
        }

    })
}