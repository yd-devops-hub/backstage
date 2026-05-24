import sodium from 'libsodium-wrappers';

/**
 * Produce `encrypted_value` for GitHub repository secrets endpoints.
 *
 * {@link https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api}
 */
export async function encryptSecretForGithub(
  plaintext: string,
  publicKeyBase64: string,
): Promise<string> {
  await sodium.ready;
  const messageBytes = sodium.from_string(plaintext);
  const keyBytes = sodium.from_base64(
    publicKeyBase64,
    sodium.base64_variants.ORIGINAL,
  );
  const boxed = sodium.crypto_box_seal(messageBytes, keyBytes);
  return sodium.to_base64(boxed, sodium.base64_variants.ORIGINAL);
}
