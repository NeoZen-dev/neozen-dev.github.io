const npsUtils = require('./nps-utils')

const packages = ['zen', 'logzen']

/*
This is a PoC for nps, works OKish, but

Issues:

- `nps foo.bar.*` doesn't execute all everything under bar (maybe excluding default)
  - npm-run-all works fine with *
  - work arounds:
    - initial value {default: `nps ${packages.map((t) => `copy.docs.neozen-tool.${t}`).join(' ')}`}
    - use npsUtils.serial (or npsUtils.parallel if possible)

- `nps foo!` (with `foo!` being alias for `foo.watch`) can't be used, as all keys are normalized (camelized, snake-cased etc)
  - Similarly for ~ and other symbols, they are stripped (so dev & dev~ are confused)

- script VS default (i.e {foo: {script: 'bar --baz'} VS {foo: {default: 'bar --baz'}, what are the semantics?

Also, it would be nice to have:

- Script names following nps with a $ prefix, eg `nps $foo $bar`
  found in key `x.y.z` should become `x.y.z.foo` & `x.y.z.bar`

*/

const copyAllNeoZenToolsDocsHtml = packages.reduce(
  (acc, name) => {
    acc[name] = `cpx '../neozen-tools/packages/${name}/dist/docs-html/**/*' '${name}' --update` // --verbose
    return acc
  },
  {
    /* initial value / accumulator */
  }
)

module.exports = {
  scripts: {
    // Website & Docs Build starters

    default: 'nps start',

    start: {
      script:
        'cd ../neozen-tools && npm-run-all clean build:docs && cd ../neozen-dev.github.io && npm-run-all copy:docs:neozen-tools',
      description: 'Build docs of neozen-tools & copy them here',
    },

    dev: {
      script: `echo No 'nps dev' default, it can be run only via neoTerm as 'nps dev:full~'`,
      watch: {
        script: 'nps serve & (sleep 2 && nps copy.watch)',
        description: 'Serve website & copy:watch docs-html from neozen-tools dist/docs-html',
      },
      // ~ means via neoTerm
      'full~': {
        script: npsUtils.series(
          'nps clean',
          'cd ../neozen-tools && npm-run-all clean docs~', // start all docs in new neoTerm consoles
          'cd ../neozen-dev.github.io && sleep 10 && nps dev.watch', // come back and serve, while copying new files ;-)
        ),
        description:
          'Start each neozen-tools docs~ (watch build docs in separate neoTerm for each package) & then serve web site',
      },
    },
    serve: {
      script: 'bundle exec jekyll serve',
      description: 'Just serve the web site',
    },

    // ################# Copy Docs from other repos
    copy: {
      default: 'nps copy.docs',
      watch: {
        script: 'nps copy.docs.watch',
        description: 'blah blah',
      },

      docs: {
        default: 'nps copy.docs.all',
        all: 'nps copy.docs.neozen-tools', // ...and other neozen-xxx for other monorepos
        watch: 'nodemon --config nodemon.docs-html.json --exec nps copy.docs.all',

        neozenTools: {
          ...copyAllNeoZenToolsDocsHtml,
          // Note: this fails ╰─$ nps copy.docs.neozen-tool.*
          // as nps doesn't match all with "*" (like npm-run-all does)

          // Also "*" is not an allowed key (script name) in nps
          // So we have to create it as the `default`, either as serial or concurrent (which is best in this case)
          default: npsUtils.concurrent(copyAllNeoZenToolsDocsHtml),
        },
      },
    },
    clean: {
      default: 'nps clean.docs',
      docs: 'rimraf logzen speczen validzen distzen',
    },
  },
}

// console.log(JSON.stringify(module.exports, null, 2))
