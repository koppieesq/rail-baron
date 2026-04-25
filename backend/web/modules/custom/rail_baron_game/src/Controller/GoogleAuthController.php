<?php

namespace Drupal\rail_baron_game\Controller;

use Drupal\Component\Utility\Crypt;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Site\Settings;
use Drupal\simple_oauth\Entities\ClientEntity;
use Drupal\simple_oauth\Repositories\AccessTokenRepository;
use GuzzleHttp\ClientInterface;
use League\OAuth2\Server\CryptKey;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Exchanges a Google ID token for a Simple OAuth Bearer token.
 *
 * Flow:
 *   1. Receive Google credential (ID token) from the React frontend.
 *   2. Verify it against Google's tokeninfo endpoint.
 *   3. Find or auto-create the corresponding Drupal user.
 *   4. Mint and return a Bearer JWT via Simple OAuth.
 */
class GoogleAuthController extends ControllerBase {

  public function __construct(
    private readonly ClientInterface $httpClient,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly AccessTokenRepository $accessTokenRepository,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly FileSystemInterface $fileSystem,
  ) {}

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('http_client'),
      $container->get('entity_type.manager'),
      $container->get('simple_oauth.repositories.access_token'),
      $container->get('config.factory'),
      $container->get('file_system'),
    );
  }

  /**
   * POST /api/auth/google
   *
   * Body (JSON): { "credential": "<google-id-token>" }
   * Response:    { "access_token", "token_type", "expires_in", "uid", "username" }
   */
  public function exchange(Request $request): JsonResponse {
    $body = json_decode($request->getContent(), TRUE) ?? [];
    $credential = trim($body['credential'] ?? '');

    if ($credential === '') {
      return new JsonResponse(['error' => 'Missing credential.'], 400);
    }

    // Verify the Google ID token and extract claims.
    $info = $this->verifyGoogleToken($credential);
    if ($info === NULL) {
      return new JsonResponse(['error' => 'Failed to verify Google token.'], 401);
    }

    $googleClientId = getenv('GOOGLE_CLIENT_ID');
    if (empty($info['sub']) || empty($googleClientId) || $info['aud'] !== $googleClientId) {
      return new JsonResponse(['error' => 'Invalid token audience.'], 401);
    }

    $email = $info['email'] ?? '';
    if ($email === '') {
      return new JsonResponse(['error' => 'Google account has no email address.'], 400);
    }

    // Load or auto-create the Drupal user.
    $user = user_load_by_mail($email);
    if (!$user) {
      $displayName = $info['name'] ?? $info['given_name'] ?? explode('@', $email)[0];
      $user = $this->createUser($email, $displayName);
    }
    elseif (!$user->isActive()) {
      return new JsonResponse(['error' => 'This account is blocked.'], 403);
    }

    // Mint and return a Bearer JWT.
    try {
      $jwt = $this->mintToken((int) $user->id());
    }
    catch (\Throwable $e) {
      \Drupal::logger('rail_baron_game')->error('Token minting failed: @msg', ['@msg' => $e->getMessage()]);
      return new JsonResponse(['error' => 'Could not create session token.'], 500);
    }

    return new JsonResponse([
      'access_token' => $jwt,
      'token_type'   => 'Bearer',
      'expires_in'   => 86400,
      'uid'          => (int) $user->id(),
      'username'     => $user->getDisplayName(),
    ]);
  }

  /**
   * Calls Google's tokeninfo endpoint to verify and decode the ID token.
   *
   * Returns the decoded token claims on success, or NULL on failure.
   */
  private function verifyGoogleToken(string $credential): ?array {
    try {
      $response = $this->httpClient->get('https://oauth2.googleapis.com/tokeninfo', [
        'query' => ['id_token' => $credential],
      ]);
      return json_decode((string) $response->getBody(), TRUE);
    }
    catch (\Throwable) {
      return NULL;
    }
  }

  /**
   * Creates a new Drupal user account for a Google-authenticated email.
   */
  private function createUser(string $email, string $displayName): \Drupal\user\UserInterface {
    /** @var \Drupal\user\UserInterface $user */
    $user = $this->entityTypeManager->getStorage('user')->create([
      'name'   => $this->makeUniqueUsername($displayName),
      'mail'   => $email,
      'pass'   => bin2hex(random_bytes(16)),
      'status' => 1,
      'init'   => $email,
    ]);
    $user->save();
    return $user;
  }

  /**
   * Mints a Simple OAuth Bearer JWT for the given Drupal user ID.
   */
  private function mintToken(int $uid): string {
    $consumers = $this->entityTypeManager
      ->getStorage('consumer')
      ->loadByProperties(['client_id' => 'rail_baron_app']);
    $consumer = reset($consumers);
    if (!$consumer) {
      throw new \RuntimeException('OAuth consumer "rail_baron_app" is not configured.');
    }

    $clientEntity = new ClientEntity($consumer);

    /** @var \Drupal\simple_oauth\Entities\AccessTokenEntity $token */
    $token = $this->accessTokenRepository->getNewToken($clientEntity, [], (string) $uid);
    $token->setIdentifier(Crypt::randomBytesBase64(40));
    $token->setExpiryDateTime(new \DateTimeImmutable('+1 day'));
    $token->setPrivateKey($this->getPrivateKey());

    $this->accessTokenRepository->persistNewAccessToken($token);

    return (string) $token->convertToJWT();
  }

  /**
   * Loads the Simple OAuth private key from config.
   */
  private function getPrivateKey(): CryptKey {
    $config = $this->configFactory->get('simple_oauth.settings');
    $path = $this->fileSystem->realpath($config->get('private_key')) ?: $config->get('private_key');
    return new CryptKey(
      file_get_contents($path),
      NULL,
      Settings::get('simple_oauth.key_permissions_check', TRUE),
    );
  }

  /**
   * Returns a Drupal username derived from the given base string that does not
   * already belong to an existing account.
   */
  private function makeUniqueUsername(string $base): string {
    $base = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $base) ?: 'user';
    $username = $base;
    $i = 1;
    while (user_load_by_name($username)) {
      $username = $base . '_' . $i++;
    }
    return $username;
  }

}
