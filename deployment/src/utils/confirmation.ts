import prompts from 'prompts';

export async function askConfirmation(message: string): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial: true,
  });
  return response.value;
}
