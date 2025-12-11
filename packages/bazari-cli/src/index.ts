#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { publishCommand } from './commands/publish.js';
import { validateCommand } from './commands/validate.js';
import { loginCommand, logoutCommand, whoamiCommand } from './commands/login.js';

const program = new Command();

program
  .name('bazari')
  .description('CLI for building and publishing Bazari apps')
  .version('0.2.16');

// Register commands
program.addCommand(createCommand);
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(publishCommand);
program.addCommand(validateCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

program.parse();
