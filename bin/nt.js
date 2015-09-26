#!/usr/bin/env node

var parser = require('nomnom')()
  .script('nt')
  .colors();

parser
  .nocommand()
  .callback(function() {
    parser.print(parser.getUsage());
  });

parser
  .command('make')
  .help('Make a torrent')
  .callback(function() {
    process.nextTick(make);
  })
  .option('announceList', {
    abbr     : 'a',
    full     : 'announce',
    list     : true,
    required : true,
    metavar  : 'URL',
    help     : 'Announce URL. At least one is required',
  })
  .option('comment', {
    abbr    : 'c',
    metavar : 'STR',
    help    : 'Add a comment to the metainfo',
  })
  .option('name', {
    abbr    : 'n',
    metavar : 'STR',
    help    : 'Name of torrent',
  })
  .option('pieceLength', {
    abbr    : 'l',
    full    : 'piece-length',
    metavar : 'INT',
    help    : 'Set piece to 2^n bytes. Default : 256KB',
  })
  .option('private', {
    abbr : 'p',
    flag : true,
    help : 'Make this a private torrent',
  })
  .option('moreInfo', {
    abbr    : 's',
    metavar : 'STR',
    help    : 'Add more info to metainfo',
  })
  .option('output', {
    abbr    : 'o',
    metavar : 'PATH',
    help    : 'Where to write the output file',
  })
  .option('maxFiles', {
    abbr    : 'f',
    full    : 'max-files',
    metavar : 'INT',
    help    : 'Max simultaneous files to open',
    })
  .option('dir', {
    abbr    : 'd',
    metavar : 'PATH',
    default : process.cwd(),
    help    : 'Torrent root directory. Default : cwd',
  })
  .option('files', {
    position : 1,
    required : true,
    list     : true,
    help     : 'List of files to add to torrent',
  });
  
parser
  .command('edit')
  .help('Read a torrent, edit its metainfo variables, and write it. ' +
        'Can\'t change its files')
  .callback(function() {
    process.nextTick(edit);
  })
  .option('announceList', {
    abbr    : 'a',
    full    : 'announce',
    list    : true,
    metavar : 'URL',
    help    : 'Announce URL',
  })
  .option('comment', {
    abbr    : 'c',
    metavar : 'STR',
    help    : 'Add a comment to the metainfo'
  })
  .option('name', {
    abbr    : 'n',
    metavar : 'STR',
    help    : 'Name of torrent. Can only be changed in multi file mode.',
  })
  .option('private', {
    abbr : 'p',
    flag : true,
    help : 'Toggle this torrent\'s private mode',
  })
  .option('moreInfo', {
    abbr    : 's',
    metavar : 'STR',
    help    : 'Add more info to metainfo',
  })
  .option('output', {
    abbr    : 'o',
    metavar : 'PATH',
    help    : 'Where to write the output file. Default : original torrent',
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file to edit',
  });

parser
  .command('infohash')
  .help('Return info hash from torrent')
  .callback(function() {
    process.nextTick(infohash);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('pieces')
  .help('Return piece hashes from torrent')
  .callback(function() {
    process.nextTick(pieces);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('name')
  .help('Return name from torrent')
  .callback(function() {
    process.nextTick(torrentname);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('announce')
  .help('Return announce url from torrent')
  .callback(function() {
    process.nextTick(announce);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('announcelist')
  .help('Return announce-list urls from torrent')
  .callback(function() {
    process.nextTick(announcelist);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('files')
  .help('Return file paths and lengths from torrent')
  .callback(function() {
    process.nextTick(files);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('urllist')
  .help('Return web seed urls from torrent')
  .callback(function() {
    process.nextTick(urllist);
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('hashcheck')
  .help('Hash checks torrent file. If no directory is given, will use cwd')
  .callback(function() {
    process.nextTick(hashcheck);
  })
  .option('maxFiles', {
    abbr    : 'f',
    full    : 'max-files',
    metavar : 'INT',
    help    : 'Max simultaneous files to open',
  })
  .option('dir', {
    abbr    : 'd',
    metavar : 'PATH',
    default : process.cwd(),
    help    : 'Directory to hash check. Default : cwd',
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file to hash check',
  });
    
var options = parser.parse();
var fs      = require('fs');
var path    = require('path');
var ss      = require('streamspeed');
var nt      = require('nt');
var util    = require('./util');
require('colors');


function make() {
  var announce = util.getAnnounce(options);
  if (!announce) {
    util.logerr('Must provide at least one announce URL');
  }

  var output =
    options.output || options.name || options.files[0];
  if (path.extname(output) !== '.torrent') output += '.torrent';

  var tmpOutput = output + '.tmp';
  var hasher = nt.makeWrite(tmpOutput, announce, options.dir,
                            options.files, options);
  var infohash;

  nt.read(hasher, function(err, torrent) {
    if (err) util.logerr(err);
    infohash = torrent.infoHash();
  });

  console.time('Time taken');

  hasher.on('error', util.logerr);
  hasher.on('progress', function(percent, speed, avg) {
    util.progress(percent, ss.toHuman(avg, 's'));
  });

  // Prevent node from exiting.
  var iid = setInterval(function() {}, 500000);

  hasher.on('end', function() {
    clearInterval(iid);
    fs.rename(tmpOutput, output, function(err) {
      if (err) util.logerr(err);
      console.log('\nFinished writing torrent at', output.bold);
      console.log('Info hash:', infohash.bold);
      console.timeEnd('Time taken');
    });
  });

  // Clean up on forced exit.
  process.on('SIGINT', function() {
    clearInterval(iid);
    fs.unlink(tmpOutput, function(err) {
      if (err) util.logerr(err);
      process.stdout.write('\n');
      process.exit(1);
    });
  });

  process.on('SIGTSTP', function() {
    hasher.toggle();
  });
}

function edit() {
  options.announce = util.getAnnounce(options);
  var output = options.output || options.file;
  if (path.extname(output) !== '.torrent') output += '.torrent';
  var tmpOutput = output + '.tmp';

  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);

    // Edit torrent object.
    var metadata = torrent.metadata;

    if (options.announce) {
      metadata.announce = options.announce;
    }

    if (options.announceList) {
      metadata.announceList = options.announceList;
    }

    if (options.comment) {
      metadata.comment = options.comment;
    }

    if (options.name && metadata.info.files.length) {
      metadata.info.name = options.name;
    }

    if (options.private) {
      if (metadata.info.private) {
        delete metadata.info.private;
      } else {
        metadata.info.private = 1;
      }
    }

    // Add additional `moreInfo` to `info`.
    for (var moreKey in options.moreInfo) {
      // Only add `moreInfo` if it doesn't overwrite `info`.
      if (!Object.prototype.hasOwnProperty.call(metadata.info, moreKey)) {
        metadata.info[moreKey] = options.moreInfo[moreKey];
      }
    }

    // Write new torrent file.
    var ws = torrent.createWriteStream(tmpOutput);

    ws.on('error', util.logerr);
    ws.on('close', function() {
      fs.rename(tmpOutput, output, function(err) {
        if (err) util.logerr(err);

        console.log('File written to', output.bold);
      });
    });

  });
}

function infohash() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);

    console.log(torrent.infoHash());
  });
}

function pieces() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    var piece = 20;
    var len = torrent.metadata.info.pieces.length / piece;
    for (var i = 0; i < len; i++) {
      var from = i * piece;
      var to = (i + 1) * piece;
      console.log(torrent.metadata.info.pieces.toString('hex', from, to));
    }
  });
}

function torrentname() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    console.log(torrent.metadata.info.name);
  });
}

function announce() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    console.log(torrent.metadata.announce);
  });
}

function announcelist() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    if (torrent.metadata.hasOwnProperty('announce-list'))
      console.log(torrent.metadata['announce-list']);
  });
}

function files() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    var files = torrent.metadata.info.files;
    if (files) {
      for (var i = 0; i < files.length; i++) {
        console.log(files[i].path, files[i].length);
      }
    } else {
      console.log(torrent.metadata.info.name);
    }
  });
}

function urllist() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);
    var list = torrent.metadata['url-list'];
    for (var i = 0; list && i < list.length; i++) {
      console.log(list[i]);
    }
  });
}

function hashcheck() {
  nt.read(options.file, function(err, torrent) {
    if (err) util.logerr(err);

    var hasher = torrent.hashCheck(options.dir, options);
    console.time('Time taken');

    hasher.on('error', util.logerr);

    var color, avg = 0;
    hasher.on('progress', function(percent, speed, a) {
      avg = a;
    });

    hasher.on('match', function(i, hash, percent) {
      util.progress(percent, ss.toHuman(avg, 's'), color);
    });

    // Change progress bar color to read on match error.
    hasher.on('matcherror', function() {
      color = 'red';
    });

    // Something so node doesn't exit.
    var iid = setInterval(function() {}, 500000);

    hasher.on('end', function() {
      clearInterval(iid);
      console.log('\nFinished hash checking torrent');
      console.timeEnd('Time taken');
    });

    process.on('SIGINT', function() {
      clearInterval(iid);
      process.stdout.write('\n');
      process.exit(1);
    });

    process.on('SIGTSTP', function() {
      hasher.toggle();
    });
  });
}
