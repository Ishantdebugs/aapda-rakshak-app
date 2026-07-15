import 'package:flutter/material.dart';
import 'screens/map_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AapadaRakshakApp());
}

class AapadaRakshakApp extends StatelessWidget {
  const AapadaRakshakApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aapada Rakshak',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFDC2626), // Emergency Red
        scaffoldBackgroundColor: const Color(0xFF090D16), // Dark Slate
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0F172A),
          elevation: 2,
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontFamily: 'Oswald',
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
            color: Colors.white,
          ),
        ),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFDC2626), // Red
          secondary: Color(0xFF3B82F6), // Blue
          surface: Color(0xFF0F172A),
          error: Color(0xFFDC2626),
        ),
        useMaterial3: true,
      ),
      home: const MapScreen(),
    );
  }
}
