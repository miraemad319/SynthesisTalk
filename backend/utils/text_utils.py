import tiktoken

def trim_text_to_token_limit(text: str, max_tokens: int, model_name: str = "gpt-4o") -> str:
    enc = tiktoken.encoding_for_model(model_name)
    tokens = enc.encode(text)
    if len(tokens) <= max_tokens:
        return text
    trimmed_tokens = tokens[:max_tokens]
    trimmed_text = enc.decode(trimmed_tokens)
    return trimmed_text
