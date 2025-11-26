import { PrismaClient } from '@prisma/client';
import { generateSocialWallet } from '../lib/auth/social-wallet.js';
import { encryptMnemonic, type EncryptedData } from '../lib/auth/encryption.js';
import { createInitialMetadata, publishProfileMetadata } from '../lib/ipfs.js';
import { mintProfileOnChain } from '../lib/profilesChain.js';

const prisma = new PrismaClient();

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export interface SocialLoginResult {
  userId: string;
  address: string;
  googleId: string; // Para validação de ownership no frontend
  isNewUser: boolean;
  mnemonicForClient?: EncryptedData;
}

/**
 * Processa login via Google OAuth
 * - Se usuário existe: retorna dados existentes
 * - Se novo usuário: cria User + SocialAccount + ManagedWallet
 * @param profile - Perfil do usuário do Google
 * @returns Resultado do login com dados do usuário e wallet
 */
export async function handleGoogleLogin(profile: GoogleProfile): Promise<SocialLoginResult> {
  console.log('🔐 [Social Auth] Iniciando handleGoogleLogin');
  console.log('📧 Google Profile:', { sub: profile.sub, email: profile.email, name: profile.name });

  // 1. Verificar se usuário já existe
  const existingSocial = await prisma.socialAccount.findUnique({
    where: {
      provider_providerId: {
        provider: 'google',
        providerId: profile.sub,
      },
    },
    include: {
      user: {
        include: {
          managedWallet: true,
        },
      },
    },
  });

  if (existingSocial) {
    console.log('✅ [Social Auth] Usuário existente encontrado:', existingSocial.userId);

    // Usuário retornando
    const managedWallet = existingSocial.user.managedWallet;

    if (!managedWallet) {
      console.error('❌ [Social Auth] Wallet gerenciado não encontrado!');
      throw new Error('Wallet gerenciado não encontrado para usuário existente');
    }

    console.log('💼 [Social Auth] Wallet encontrada:', managedWallet.address);
    console.log('🔐 [Social Auth] isPinSetup:', managedWallet.isPinSetup);

    // IMPORTANTE: Enviar wallet se PIN ainda não foi configurado
    // Isso permite que o usuário complete o setup mesmo após clearing do dispositivo
    let mnemonicForClient: EncryptedData | undefined;

    if (!managedWallet.isPinSetup) {
      console.log('⚠️ [Social Auth] PIN não configurado - enviando wallet novamente');
      mnemonicForClient = {
        encrypted: managedWallet.encryptedMnemonic,
        iv: managedWallet.iv,
        salt: managedWallet.salt,
        authTag: managedWallet.authTag,
      };

      // Marcar como enviado (mas isPinSetup ainda é false)
      await prisma.managedWallet.update({
        where: { id: managedWallet.id },
        data: { sentToClient: true },
      });
    } else {
      console.log('✅ [Social Auth] PIN já configurado - não enviando wallet');
    }

    // VERIFICAR SE PROFILE EXISTE (para usuários criados antes da implementação)
    let existingProfile = await prisma.profile.findUnique({
      where: { userId: existingSocial.userId },
    });

    if (!existingProfile) {
      console.log('⚠️ [Social Auth] Profile não existe para usuário antigo. Criando agora...');

      // Criar profile para usuário existente
      const defaultHandle = `user_${managedWallet.address.slice(0, 8).toLowerCase()}`;
      let finalHandle = defaultHandle;
      let handleExists = await prisma.profile.findUnique({ where: { handle: defaultHandle } });
      let suffix = 1;

      while (handleExists) {
        finalHandle = `${defaultHandle}_${suffix}`;
        handleExists = await prisma.profile.findUnique({ where: { handle: finalHandle } });
        suffix++;
      }

      // Criar profile no banco
      existingProfile = await prisma.profile.create({
        data: {
          userId: existingSocial.userId,
          handle: finalHandle,
          displayName: finalHandle,
        },
      });

      console.log('✅ [Social Auth] Profile criado:', existingProfile.id);

      // Processar IPFS + NFT em background (não bloquear login)
      (async () => {
        try {
          const metadata = createInitialMetadata(existingProfile!);
          const cid = await publishProfileMetadata(metadata);
          const profileId = await mintProfileOnChain(managedWallet.address, existingProfile!.handle, cid);

          await prisma.profile.update({
            where: { id: existingProfile!.id },
            data: {
              onChainProfileId: profileId,
              metadataCid: cid,
            },
          });

          console.log('✅ [Social Auth] Profile on-chain criado para usuário existente');
        } catch (error) {
          console.error('❌ [Social Auth] Erro ao criar profile on-chain para usuário existente:', error);
        }
      })();
    }

    console.log('🔄 [Social Auth] Retornando usuário existente. mnemonicForClient:', !!mnemonicForClient);

    // IMPORTANTE: Tratar como "novo usuário" no frontend se PIN não foi configurado ainda
    // Isso força o fluxo de criação de PIN mesmo para usuários que já existem no banco
    const treatAsNewUser = !managedWallet.isPinSetup;

    return {
      userId: existingSocial.userId,
      address: managedWallet.address,
      googleId: profile.sub,
      isNewUser: treatAsNewUser, // true se PIN não foi configurado
      mnemonicForClient,
    };
  }

  console.log('🆕 [Social Auth] Novo usuário - criando wallet...');

  // 2. Novo usuário - criar wallet SR25519
  const walletData = await generateSocialWallet();
  console.log('🔑 [Social Auth] Wallet gerada:', walletData.address);

  // 3. Criptografar mnemonic
  const encryptedData = encryptMnemonic(walletData.mnemonic);
  console.log('🔐 [Social Auth] Mnemonic criptografado');

  // 4. Criar User + SocialAccount + ManagedWallet (transação atômica)
  const result = await prisma.$transaction(async (tx) => {
    // Criar User
    const user = await tx.user.create({
      data: {
        address: walletData.address,
      },
    });

    // Criar SocialAccount
    await tx.socialAccount.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerId: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
    });

    // Criar ManagedWallet
    await tx.managedWallet.create({
      data: {
        userId: user.id,
        encryptedMnemonic: encryptedData.encrypted,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        authTag: encryptedData.authTag,
        address: walletData.address,
        sentToClient: true, // Será enviado agora
      },
    });

    console.log('✅ [Social Auth] Usuário criado com sucesso:', user.id);

    // 5. Criar Profile (seguindo mesmo padrão do login tradicional)
    console.log('👤 [Social Auth] Criando perfil público...');

    // Gerar handle default a partir do endereço
    const defaultHandle = `user_${walletData.address.slice(0, 8).toLowerCase()}`;
    console.log('🔖 [Social Auth] Handle default:', defaultHandle);

    // Verificar se handle já existe (improvável, mas importante validar)
    let finalHandle = defaultHandle;
    let handleExists = await tx.profile.findUnique({ where: { handle: defaultHandle } });
    let suffix = 1;

    while (handleExists) {
      finalHandle = `${defaultHandle}_${suffix}`;
      handleExists = await tx.profile.findUnique({ where: { handle: finalHandle } });
      suffix++;
    }

    console.log('✅ [Social Auth] Handle final:', finalHandle);

    // Criar profile no banco
    const newProfile = await tx.profile.create({
      data: {
        userId: user.id,
        handle: finalHandle,
        displayName: finalHandle,
      },
    });

    console.log('✅ [Social Auth] Profile criado no banco:', newProfile.id);

    return {
      userId: user.id,
      address: walletData.address,
      googleId: profile.sub,
      isNewUser: true,
      mnemonicForClient: encryptedData,
      profile: newProfile, // Retornar profile para processamento IPFS/NFT fora da transação
    };
  });

  console.log('🎉 [Social Auth] Transação completa. Iniciando IPFS + NFT minting...');

  // 6. Processar IPFS e NFT minting FORA da transação (pode demorar ~6 segundos)
  try {
    // Criar metadados IPFS
    const metadata = createInitialMetadata(result.profile);
    console.log('📝 [Social Auth] Metadados criados');

    // Publicar no IPFS
    const cid = await publishProfileMetadata(metadata);
    console.log('📤 [Social Auth] Metadados publicados no IPFS:', cid);

    // Mintar NFT on-chain
    console.log('⛓️  [Social Auth] Iniciando mint do NFT on-chain...');
    const profileId = await mintProfileOnChain(result.address, result.profile.handle, cid);
    console.log('✅ [Social Auth] NFT mintado! Profile ID:', profileId);

    // Atualizar profile com IDs on-chain
    await prisma.profile.update({
      where: { id: result.profile.id },
      data: {
        onChainProfileId: profileId,
        metadataCid: cid,
      },
    });

    console.log('✅ [Social Auth] Profile atualizado com onChainProfileId e metadataCid');
  } catch (error) {
    // Log do erro, mas NÃO falhar o login
    // O perfil básico já existe no banco, IPFS/NFT pode ser processado depois
    console.error('❌ [Social Auth] Erro ao processar IPFS/NFT (perfil básico criado):', error);
    console.error('[Social Auth] O usuário pode fazer login, mas o perfil on-chain pode estar incompleto');
  }

  console.log('🎉 [Social Auth] handleGoogleLogin completo para novo usuário');

  // Remover profile do retorno (não é necessário no response)
  const { profile: _profile, ...resultWithoutProfile } = result;
  return resultWithoutProfile;
}

/**
 * Busca informações do SocialAccount por userId
 * @param userId - ID do usuário
 * @returns Dados do SocialAccount ou null
 */
export async function getSocialAccountByUserId(userId: string) {
  return prisma.socialAccount.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          managedWallet: true,
        },
      },
    },
  });
}

/**
 * Busca ManagedWallet por address
 * @param address - Address SR25519
 * @returns Dados do ManagedWallet ou null
 */
export async function getManagedWalletByAddress(address: string) {
  return prisma.managedWallet.findFirst({
    where: { address },
    include: {
      user: true,
    },
  });
}
