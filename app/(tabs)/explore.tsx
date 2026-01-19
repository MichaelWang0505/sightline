// TabTwoScreen.tsx
import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

/* ---------------
   Custom Components
----------------*/
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';

/* ---------------
      Styles
----------------*/
const styles = StyleSheet.create({
  headerImage: {
    position: 'absolute',
    bottom: -90,
    left: -35,
    color: '#808080',
  },
  titleContainer: {
    flexDirection: 'row',
    // A little breathing room below the title
    marginBottom: 12,
  },
});

/* --------------------------------------------------------------
   Tab Two Screen – "Explore"
   This screen gives the user helpful info about how the app works.
--------------------------------------------------------------*/
export default function ExploreScreen() {
  // Header icon using a chevron combo as a placeholder graphic
  const headerIcon = (
    <IconSymbol
      name="chevron.left.forwardslash.chevron.right"
      size={310}
      color="#808080"
      style={styles.headerImage}
    />
  );

  return (
    <ParallaxScrollView
      // Different background colours for light/dark mode
      headerBackgroundColor={{
        light: '#D0D0D0',
        dark: '#353636',
      }}
      headerImage={headerIcon}
    >
      {/* ---------- Title ---------- */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            // Rounded font makes the title feel friendly
            fontFamily: 'rounded',
          }}
        >
          Explore
        </ThemedText>
      </ThemedView>

      {/* Quick intro text */}
      <ThemedText style={{ marginBottom: 16 }}>
        This app includes example code to help you get started.
      </ThemedText>

      {/* ---------------------------------------------------
          Collapsible sections to  keep the screen tidy
       --------------------------------------------------- */}

      {/* 1️⃣ Routing */}
      <Collapsible title="File‑based routing">
        <ThemedText>
          This app has two screens built with Expo Router:
        </ThemedText>
        <ThemedText style={{ marginVertical: 4 }}>
          • <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> (Home)
        </ThemedText>
        <ThemedText>
          • <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText> (this screen)
        </ThemedText>
        <ThemedText>
          The tab navigator itself lives in{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link" style={{ marginTop: 8 }}>
            Read the routing docs →
          </ThemedText>
        </ExternalLink>
      </Collapsible>

      {/* 2️⃣ Platform support */}
      <Collapsible title="Android, iOS, and Web">
        <ThemedText>
          This project runs on Android, iOS, and the web!  
          To launch the web version, hit <ThemedText type="defaultSemiBold">w</ThemedText> while the dev server is running.
        </ThemedText>
      </Collapsible>

      {/* 3️⃣ Images */}
      <Collapsible title="Images">
        <ThemedText>
          Static images support @2x (Retina) and @3x (iPhone Plus/Pro) assets automatically.
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ 
            width: 100, 
            height: 100, 
            alignSelf: 'center',
            marginVertical: 12,
          }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">Image guide →</ThemedText>
        </ExternalLink>
      </Collapsible>

      {/* 4️⃣ Theme (Light/Dark mode) */}
      <Collapsible title="Light & Dark mode">
        <ThemedText>
          The app respects the user’s system theme.  
          Components use <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> to
          decide whether to show light or dark colours.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link" style={{ marginTop: 8 }}>Theme docs →</ThemedText>
        </ExternalLink>
      </Collapsible>

      {/* 5Animations */}
      <Collapsible title="Animations">
        <ThemedText>
          Check out <ThemedText type="defaultSemiBold">components/HelloWave.tsx</ThemedText> – it
          uses <ThemedText type="defaultSemiBold" style={{ fontFamily: 'mono' }}>
            react-native-reanimated
          </ThemedText> to wave hello!
        </ThemedText>

        {/* Only show the parallax note on iOS */}
        {Platform.OS === 'ios' && (
          <ThemedText style={{ marginTop: 8 }}>
            On iOS, the header has a nice parallax scroll effect (see{' '}
            <ThemedText type="defaultSemiBold">ParallaxScrollView</ThemedText>).
          </ThemedText>
        )}
      </Collapsible>
    </ParallaxScrollView>
  );
}