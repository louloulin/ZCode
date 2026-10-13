export const CLI_COMMAND_NAME = "lumos";
export const CLI_PROCESS_NAME = "lumos-cli";

interface ProcessTitleTarget {
  title: string;
}

export const setCliProcessTitle = (
  target: ProcessTitleTarget = process,
): void => {
  target.title = CLI_PROCESS_NAME;
};
