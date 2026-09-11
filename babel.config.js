module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            'firebase/firestore': './src/services/firebase-firestore-compat.ts',
            'firebase/storage': './src/services/firebase-storage-compat.ts',
            'firebase/auth': './src/services/firebase-auth-compat.ts',
            'firebase/app': './src/services/firebase-app-compat.ts',
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@services': './src/services',
            '@utils': './src/utils',
            '@types': './src/types',
            '@redux': './src/redux',
            '@hooks': './src/hooks',
            '@assets': './assets',
          },
        },
      ],
    ],
  };
};
