import * as vscode from 'vscode';

interface PhasePickerInput {
  /** Optional pre-selected values from a previous run (e.g. from project.profile.yml) */
  defaults?: {
    product_refinement?: boolean;
    tdd?: boolean;
  };
}

interface PhasePickerOutput {
  product_refinement: boolean;
  tdd: boolean;
}

/**
 * LanguageModelTool that shows a VS Code QuickPick for selecting optional
 * workflow phases (Product Refinement, TDD) instead of asking in plain text.
 *
 * The model calls this tool when it reaches the phase-selection step.
 * The tool blocks until the user makes a selection, then returns the result
 * as a structured JSON object so the model can proceed with dispatch.
 */
export class PhasePickerTool implements vscode.LanguageModelTool<PhasePickerInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<PhasePickerInput>,
    token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const defaults = options.input.defaults ?? {};

    interface PhaseItem extends vscode.QuickPickItem {
      id: keyof PhasePickerOutput;
      picked: boolean;
    }

    const items: PhaseItem[] = [
      {
        id: 'product_refinement',
        label: '$(lightbulb) Product Refinement',
        description:
          'Adds a conversational agent that turns vague ideas into structured requirements',
        detail: 'Recommended if you usually start from a rough concept.',
        picked: defaults.product_refinement ?? false,
      },
      {
        id: 'tdd',
        label: '$(beaker) TDD — Test-Driven Development',
        description: 'Adds test-designer + validator agents for test-first development',
        detail: 'Recommended if you want failing tests to drive implementation.',
        picked: defaults.tdd ?? false,
      },
    ];

    const picker = vscode.window.createQuickPick<PhaseItem>();
    picker.title = 'Optional workflow phases';
    picker.placeholder = 'Select the phases to enable (Space to toggle, Enter to confirm)';
    picker.canSelectMany = true;
    picker.items = items;
    picker.selectedItems = items.filter((i) => i.picked);

    const result = await new Promise<PhasePickerOutput | null>((resolve) => {
      token.onCancellationRequested(() => {
        picker.dispose();
        resolve(null);
      });

      picker.onDidAccept(() => {
        const selected = new Set(picker.selectedItems.map((i) => i.id));
        picker.dispose();
        resolve({
          product_refinement: selected.has('product_refinement'),
          tdd: selected.has('tdd'),
        });
      });

      picker.onDidHide(() => {
        picker.dispose();
        resolve(null);
      });

      picker.show();
    });

    if (!result) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({ product_refinement: false, tdd: false, cancelled: true }),
        ),
      ]);
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result)),
    ]);
  }

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<PhasePickerInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Selecting workflow phases…',
    };
  }
}
