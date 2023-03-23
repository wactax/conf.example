#!/usr/bin/env coffee

> @w5/uridir
  zx/globals:
  @w5/yml > load
  path > join basename dirname
  fs > opendirSync existsSync rmSync symlinkSync

PWD = uridir import.meta
PWD_LEN = PWD.length + 1
PWD_DIR = basename PWD
ROOT = dirname PWD

walk = (dir)->
  for await d from await opendirSync(dir)
    {name} = d
    entry = join(dir, name)
    if d.isDirectory()
      if not [
        'node_modules','.git'
      ].includes name
        yield from walk(entry)
    else if d.isFile()
      pos = name.lastIndexOf '.'
      if ~pos
        ext = name[pos+1..]
      else
        ext = ''
      if [
        'js'
        'mjs'
      ].includes(ext) or ['pkg.yml'].includes(name) or name.startsWith('.env')
        yield entry[PWD_LEN..]

for await i from walk PWD
  fp = join ROOT,i
  console.log fp
  if existsSync dirname(fp)
    rmSync fp, force:true
  symlinkSync(
    '../'.repeat(
      i.split('/').length - 1
    )+join(PWD_DIR,i)
    fp
  )
