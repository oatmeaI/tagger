import { Command } from "commander";
import { enforce } from "./commands/enforcer/enforcer.js";

const program = new Command();

program
    .name("enforcer")
    .description("Keep your MP3 tags in line")
    .argument('<dir>', 'The directory to scan')
    .option("-o, --out", "Write out changes file")
    .option("-c, --commit", "Commit changes from changes file")
    .option("-x, --noMove", "Don't move files")
    .option("-q, --quiet", "Skip input")
    .option("--config", "Open the config file")
    .option("--paths", "Open the config file")
    .option("--emptyCache", "Empty the caches")
    .action(enforce);

program.parse(process.argv);
