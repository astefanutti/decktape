import chalk from 'chalk';

class ArgParser {
  constructor() {
    this.commands = {}; // expected commands
    this.specs = {}; // option specifications
  }
  /* Add a command to the expected commands */
  command(name) {
    var command;
    if (name) {
      command = this.commands[name] = {
        name: name,
        specs: {}
      };
    }
    else {
      command = this.fallback = {
        specs: {}
      };
    }

    // facilitates command('name').options().cb().help()
    var chain = {
      options: function (specs) {
        command.specs = specs;
        return chain;
      },
      opts: function (specs) {
        // old API
        return this.options(specs);
      },
      option: function (name, spec) {
        command.specs[name] = spec;
        return chain;
      },
      callback: function (cb) {
        command.cb = cb;
        return chain;
      },
      help: function (help) {
        command.help = help;
        return chain;
      },
      usage: function (usage) {
        command._usage = usage;
        return chain;
      },
      root: function (root) {
        command.root = root;
        return chain;
      }
    };
    return chain;
  }
  nocommand() {
    return this.command();
  }
  options(specs) {
    this.specs = specs;
    return this;
  }
  opts(specs) {
    // old API
    return this.options(specs);
  }
  globalOpts(specs) {
    // old API
    return this.options(specs);
  }
  option(name, spec) {
    this.specs[name] = spec;
    return this;
  }
  usage(usage) {
    this._usage = usage;
    return this;
  }
  printer(print) {
    this.print = print;
    return this;
  }
  script(script) {
    this._script = script;
    return this;
  }
  scriptName(script) {
    // old API
    return this.script(script);
  }
  help(help) {
    this._help = help;
    return this;
  }
  colors() {
    // deprecated - colors are on by default now
    return this;
  }
  nocolors() {
    this._nocolors = true;
    return this;
  }
  parseArgs(argv) {
    // old API
    return this.parse(argv);
  }
  nom(argv) {
    return this.parse(argv);
  }
  parse(argv) {
    this.print = this.print || function (str, code) {
      console.log(str);
      process.exit(code || 0);
    };
    this._help = this._help || "";
    this._script = this._script || process.argv[0] + " "
      + require('path').basename(process.argv[1]);
    this.specs = this.specs || {};

    var argv = argv || process.argv.slice(2);

    var command = argv.find(arg => Arg(arg).isValue && this.commands[arg], this);
    command = command && this.commands[command];
    var commandExpected = Object.keys(this.commands).length > 0;

    if (commandExpected) {
      if (command) {
        if (command.root) {
          this.specs = command.specs;
        } else {
          Object.assign(this.specs, command.specs);
        }
        this.subcommand = true;
        this._script += " " + command.name;
        if (command.help) {
          this._help = command.help;
        }
        this.specs.command = {
          hidden: true,
          name: 'command',
          position: 0,
          help: command.help
        };
      }
      else if (!this.fallback) {
        return this.print(this._script + ": command expected", 1);
      }
      else {
        // no command but command expected e.g. 'git -v'
        var helpStringBuilder = {
          list: function () {
            return 'one of: ' + Object.entries(this.commands)
              .filter(([key, cmd]) => !cmd.root)
              .map(([key, cmd]) => key).join(', ');
          },
          twoColumn: function () {
            // find the longest command name to ensure horizontal alignment
            var maxLength = Math.max(...Object.values(this.commands).map(cmd => cmd.name.length));
            // create the two column text strings
            var cmdHelp = Object.entries(this.commands).map(([name, cmd]) => {
              var diff = maxLength - name.length;
              var pad = new Array(diff + 4).join(" ");
              return "  " + [name, pad, cmd.help].join(" ");
            });
            return "\n" + cmdHelp.join("\n");
          }
        };

        // if there are a small number of commands and all have help strings,
        // display them in a two column table; otherwise use the brief version.
        // The arbitrary choice of "20" comes from the number commands git
        // displays as "common commands"
        var helpType = 'list';
        if (Object.keys(this.commands).length <= 20) {
          if (Object.values(this.commands).every(cmd => cmd.help)) {
            helpType = 'twoColumn';
          }
        }

        this.specs.command = {
          name: 'command',
          position: 0,
          help: helpStringBuilder[helpType].call(this)
        };

        if (this.fallback) {
          Object.assign(this.specs, this.fallback.specs);
          this._help = this.fallback.help;
        } else {
          this.specs.command.required = true;
        }
      }
    }

    if (this.specs.length === undefined) {
      // specs is a hash not an array
      this.specs = Object.entries(this.specs).map(([name, opt]) => {
        opt.name = name;
        return opt;
      });
    }
    this.specs = this.specs.map(opt => Opt(opt));

    if (argv.indexOf("--help") >= 0 || argv.indexOf("-h") >= 0) {
      return this.print(this.getUsage());
    }

    var options = {};
    var args = argv.map(arg => Arg(arg)).concat(Arg());

    var positionals = [];

    /* parse the args */
    var that = this;
    args.reduce(function (arg, val) {
      /* positional */
      if (arg.isValue) {
        positionals.push(arg.value);
      }
      else if (arg.chars) {
        var last = arg.chars.pop();

        /* -cfv */
        (arg.chars).forEach(function (ch) {
          that.setOption(options, ch, true);
        });

        /* -v key */
        if (!that.opt(last).flag) {
          if (val.isValue) {
            that.setOption(options, last, val.value);
            return Arg(); // skip next turn - swallow arg
          }
          else {
            that.print("'-" + (that.opt(last).name || last) + "'"
              + " expects a value\n\n" + that.getUsage(), 1);
          }
        }
        else {
          /* -v */
          that.setOption(options, last, true);
        }

      }
      else if (arg.full) {
        var value = arg.value;

        /* --key */
        if (value === undefined) {
          /* --key value */
          if (!that.opt(arg.full).flag) {
            if (val.isValue) {
              that.setOption(options, arg.full, val.value);
              return Arg();
            }
            else {
              that.print("'--" + (that.opt(arg.full).name || arg.full) + "'"
                + " expects a value\n\n" + that.getUsage(), 1);
            }
          }
          else {
            /* --flag */
            value = true;
          }
        }
        that.setOption(options, arg.full, value);
      }
      return val;
    });

    if (command && command.name !== positionals[0])
      this.print("command '" + command.name + "' is expected to be the first argument", 1);

    // preserve positional argument indexes
    if (!command && this.fallback)
      positionals.unshift(undefined);

    positionals.forEach(function (pos, index) {
      this.setOption(options, index, pos);
    }, this);

    options._ = positionals;

    this.specs.forEach(function (opt) {
      if (opt.default !== undefined && options[opt.name] === undefined) {
        this.setOption(options, opt.name, opt.default);
      }
    }, this);

    // exit if required arg isn't present
    this.specs.forEach(function (opt) {
      if (opt.required && options[opt.name] === undefined) {
        var msg = opt.name + " argument is required";
        msg = this._nocolors ? msg : chalk.red(msg);

        this.print("\n" + msg + "\n" + this.getUsage(), 1);
      }
    }, this);

    if (command && command.cb) {
      command.cb(options);
    }
    else if (this.fallback && this.fallback.cb) {
      this.fallback.cb(options);
    }

    return options;
  }
  getUsage() {
    if (this.command && this.command._usage) {
      return this.command._usage;
    }
    else if (this.fallback && this.fallback._usage) {
      return this.fallback._usage;
    }
    if (this._usage) {
      return this._usage;
    }

    // todo: use a template
    var str = "\n";
    if (!this._nocolors) {
      str += chalk.bold("Usage:");
    }
    else {
      str += "Usage:";
    }
    str += " " + this._script;

    const positionals = this.specs
      .filter(spec => spec.position != undefined && !spec.hidden)
      .sort((s1, s2) => s1.position - s2.position);
    const options = this.specs.filter(spec => spec.position === undefined);

    if (options.length) {
      if (!this._nocolors) {
        // must be a better way to do this
        str += chalk.blue(" [options]");
      }
      else {
        str += " [options]";
      }
    }

    // assume there are no gaps in the specified pos. args
    positionals.forEach(function (pos) {
      str += " ";
      var posStr = pos.string;
      if (!posStr) {
        posStr = pos.name || "arg" + pos.position;
        if (pos.required) {
          posStr = "<" + posStr + ">";
        } else {
          posStr = "[" + posStr + "]";
        }
        if (pos.list) {
          posStr += "...";
        }
      }
      str += posStr;
    });

    const rootCmds = this.subcommand ? [] : Object.values(this.commands).filter(cmd => cmd.root);
    if (rootCmds.length) {
      str += '\n';
    }
    rootCmds.forEach(cmd => str += '       ' + this._script + ' ' + cmd.name + '\n');

    if (options.length || positionals.length) {
      str += rootCmds.length ? '\n' : '\n\n';
    }

    function spaces(length) {
      var spaces = "";
      for (var i = 0; i < length; i++) {
        spaces += " ";
      }
      return spaces;
    }
    var longest = Math.max(...positionals.map(pos => pos.name.length));

    positionals.forEach(function (pos) {
      var posStr = pos.string || pos.name;
      str += posStr + spaces(longest - posStr.length) + "     ";
      if (!this._nocolors) {
        str += chalk.grey(pos.help || "");
      }
      else {
        str += (pos.help || "");
      }
      str += "\n";
    }, this);
    if (positionals.length && options.length) {
      str += "\n";
    }

    if (options.length) {
      if (!this._nocolors) {
        str += chalk.blue("Options:");
      }
      else {
        str += "Options:";
      }
      str += "\n";

      longest = Math.max(...options.map(opt => opt.string.length));

      options.forEach(function (opt) {
        if (!opt.hidden) {
          str += "   " + opt.string + spaces(longest - opt.string.length) + "   ";

          var defaults = (opt.default != null ? "  [" + opt.default + "]" : "");
          var help = opt.help ? opt.help + defaults : "";
          str += this._nocolors ? help : chalk.grey(help);

          str += "\n";
        }
      }, this);
    }

    if (this._help) {
      str += "\n" + this._help;
    }
    return str;
  }
  opt(arg, value) {
    // get the specified opt for this parsed arg
    var match;
    this.specs.forEach(function (opt) {
      if (opt.matches(arg)) {
        match = opt;
      }
    });
    if (!match) {
      if (typeof value == "string") {
        this.print("invalid argument '" + value + "'"
              + " \n\n" + this.getUsage(), 1);
      } else {
        this.print("invalid option '" + (arg.length == 1 ? "-" : "--") + arg + "'"
        + " \n\n" + this.getUsage(), 1);
      }
    }
    return match;
  }
  setOption(options, arg, value) {
    var option = this.opt(arg, value);
    if (option.callback) {
      var message = option.callback(value);

      if (typeof message == "string") {
        this.print(message, 1);
      }
    }

    if (option.type != "string") {
      try {
        // infer type by JSON parsing the string
        value = JSON.parse(value);
      }
      catch (e) { }
    }

    if (option.transform) {
      value = option.transform(value);
    }

    var name = option.name || arg;
    if (option.choices && option.choices.indexOf(value) == -1) {
      this.print(name + " must be one of: " + option.choices.join(", "), 1);
    }

    if (option.list) {
      if (!options[name]) {
        options[name] = [value];
      }
      else {
        options[name].push(value);
      }
    }
    else {
      options[name] = value;
    }
  }
}





/* an arg is an item that's actually parsed from the command line
   e.g. "-l", "log.txt", or "--logfile=log.txt" */
var Arg = function(str) {
  var abbrRegex = /^\-(\w+?)$/,
      fullRegex = /^\-\-(no\-)?(.+?)(?:=(.+))?$/,
      valRegex = /^[^\-].*/;

  var charMatch = abbrRegex.exec(str),
      chars = charMatch && charMatch[1].split("");

  var fullMatch = fullRegex.exec(str),
      full = fullMatch && fullMatch[2];

  var isValue = str !== undefined && (str === "" || valRegex.test(str));
  var value;
  if (isValue) {
    value = str;
  }
  else if (full) {
    value = fullMatch[1] ? false : fullMatch[3];
  }

  return {
    str: str,
    chars: chars,
    full: full,
    value: value,
    isValue: isValue
  }
}


/* an opt is what's specified by the user in opts hash */
var Opt = function(opt) {
  var strings = (opt.string || "").split(","),
      abbr, full, metavar;
  for (var i = 0; i < strings.length; i++) {
    var string = strings[i].trim(),
        matches;
    if (matches = string.match(/^\-([^-])(?:\s+(.*))?$/)) {
      abbr = matches[1];
      metavar = matches[2];
    }
    else if (matches = string.match(/^\-\-(.+?)(?:[=\s]+(.+))?$/)) {
      full = matches[1];
      metavar = metavar || matches[2];
    }
  }

  matches = matches || [];
  var abbr = opt.abbr || abbr,   // e.g. v from -v
      full = opt.full || full, // e.g. verbose from --verbose
      metavar = opt.metavar || metavar;  // e.g. PATH from '--config=PATH'

  var string;
  if (opt.string) {
    string = opt.string;
  }
  else if (opt.position === undefined) {
    string = "";
    if (abbr) {
      string += "-" + abbr;
      if (metavar)
        string += " " + metavar
      string += ", ";
    }
    string += "--" + (full || opt.name);
    if (metavar) {
      string += " " + metavar;
    }
  }

  opt = Object.assign(opt, {
    name: opt.name || full || abbr,
    string: string,
    abbr: abbr,
    full: full,
    metavar: metavar,
    matches: function(arg) {
      return opt.full == arg || opt.abbr == arg || opt.position == arg
        || opt.name == arg || (opt.list && arg >= opt.position);
    }
  });
  return opt;
}


var createParser = function() {
  return new ArgParser();
}

export default createParser();
