
import { Soybean } from './build/exports/index.js'
import handlers from './build/exports/handlers.js'

export default Soybean({
    routines: {
        launch: [
            handlers.group([
                handlers.fs.readFile('./package.json', 'package'),
                handlers.handle(e => console.log(e.get('package').toString()))
            ])
        ],
        watch: [ 
            {
                file: './soybean.config.js',
                options: { rateLimiter: 1500 },
                handle: handlers.group([
                    handlers.fs.mkdir('./test'),
                    handlers.fs.copyFile('./soybean.config.js', './test/soybean.config.js'),
                    handlers.cp.restart('http')
                ])
            } 
        ]
    },
    cp: {
        http: {
            command: ['http-server'],
            cwd: './',
            stdout: 'none'
        }
    },
    terminal: {
        passthroughShell: true,
        keepHistory: 100,
        handlers: {
            'test': handlers.group([
                handlers.fs.readFile('./build/lib/exports.js', 'exports', 'utf-8'),
                handlers.handle(e => e.update('exports', x => '---\nThe exports file:\n---\n' + x)),
                handlers.fs.mkdir('./test'),
                handlers.fs.writeFile('./test/exports.txt', Symbol('exports')),
            ])
        }
    }
})
