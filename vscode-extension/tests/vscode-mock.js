/**
 * Mock for the 'vscode' module — used by unit tests to avoid needing
 * a real VS Code host. Only stubs the APIs used by our extension.
 */
'use strict';

class Uri {
  constructor(scheme, authority, path) {
    this.scheme = scheme || 'file';
    this.authority = authority || '';
    this.path = path || '';
    this.fsPath = path || '';
  }
  static file(p) { return new Uri('file', '', p); }
  static joinPath(base, ...segments) {
    const joined = [base.fsPath, ...segments].join('/');
    return Uri.file(joined);
  }
  toString() { return `${this.scheme}://${this.authority}${this.path}`; }
}

class LanguageModelError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

class LanguageModelChatMessage {
  constructor(role, content) {
    this.role = role;
    this.content = content;
  }
  static User(content) { return new LanguageModelChatMessage('user', content); }
  static Assistant(content) { return new LanguageModelChatMessage('assistant', content); }
}

class ChatResponseMarkdownPart {
  constructor(value) {
    this.value = { value };
  }
}

class LanguageModelTextPart {
  constructor(value) {
    this.value = value;
  }
}

class LanguageModelToolCallPart {
  constructor(callId, name, input) {
    this.callId = callId;
    this.name = name;
    this.input = input;
  }
}

class LanguageModelToolResultPart {
  constructor(callId, content) {
    this.callId = callId;
    this.content = content;
  }
}

class ChatRequestTurn {
  constructor(prompt) {
    this.prompt = prompt;
  }
}

class ChatResponseTurn {
  constructor(response, result) {
    this.response = response;
    this.result = result;
  }
}

const workspace = {
  getConfiguration(section) {
    return {
      get(key, defaultValue) { return defaultValue; },
    };
  },
  workspaceFolders: [{ uri: Uri.file('/test/workspace') }],
  onDidChangeConfiguration() { return { dispose() {} }; },
};

const chat = {
  createChatParticipant(_id, _handler) {
    return {
      iconPath: null,
      followupProvider: null,
      dispose() {},
    };
  },
};

module.exports = {
  Uri,
  LanguageModelError,
  LanguageModelChatMessage,
  LanguageModelTextPart,
  LanguageModelToolCallPart,
  LanguageModelToolResultPart,
  ChatResponseMarkdownPart,
  ChatRequestTurn,
  ChatResponseTurn,
  workspace,
  chat,
};
