import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with SingleTickerProviderStateMixin {
  final MapController _mapController = MapController();
  
  Position? _currentPosition;
  StreamSubscription<Position>? _positionStreamSubscription;
  bool _isLoadingLocation = true;
  bool _permissionDenied = false;
  String? _statusMessage;

  // Active SOS variables
  bool _isSOSActive = false;
  LatLng? _sosLocation;

  // Selected marker details overlay state
  dynamic _selectedEntity;

  // Pulsing animation controller for the GPS dot
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // Mock initial databases (located in Delhi area, matching React defaults)
  final List<Map<String, dynamic>> _mockIncidents = [
    {
      'id': 'inc-1',
      'title': 'Chemical Pipeline Leak',
      'type': 'hazardous',
      'severity': 'high',
      'locationName': 'Industrial Area Sector 5',
      'lat': 28.6190,
      'lng': 77.2010,
      'details': 'Slight vapor cloud reported. Rescue responders evacuating nearby blocks.'
    },
    {
      'id': 'inc-2',
      'title': 'Flash Flood Alert',
      'type': 'flood',
      'severity': 'medium',
      'locationName': 'Yamuna Bank Marg',
      'lat': 28.6320,
      'lng': 77.2280,
      'details': 'Water logs rising. Safe paths routed to North Safe Zones.'
    }
  ];

  final List<Map<String, dynamic>> _mockCamps = [
    {
      'id': 'camp-1',
      'name': 'Central Park Shelter',
      'beds': 150,
      'bedsOccupied': 112,
      'foodRations': 80,
      'waterSupply': 90,
      'lat': 28.6120,
      'lng': 77.2100,
    },
    {
      'id': 'camp-2',
      'name': 'North Hill Refuge Camp',
      'beds': 200,
      'bedsOccupied': 195,
      'foodRations': 25,
      'waterSupply': 15,
      'lat': 28.6280,
      'lng': 77.1950,
    }
  ];

  @override
  void initState() {
    super.initState();
    
    // Set up location pulse animation
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 8.0, end: 18.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initLocationServices();
  }

  @override
  void dispose() {
    _positionStreamSubscription?.cancel();
    _pulseController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  // Request location permissions and fetch GPS stream
  Future<void> _initLocationServices() async {
    setState(() {
      _isLoadingLocation = true;
      _permissionDenied = false;
      _statusMessage = "Requesting GPS permissions...";
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _isLoadingLocation = false;
          _statusMessage = "Location services are disabled on your device.";
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _isLoadingLocation = false;
            _permissionDenied = true;
            _statusMessage = "Location permission denied by user.";
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _isLoadingLocation = false;
          _permissionDenied = true;
          _statusMessage = "Location permission permanently denied. Enable in device settings.";
        });
        return;
      }

      // Fetch current location to initialize center
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentPosition = position;
        _isLoadingLocation = false;
        _statusMessage = null;
      });

      // Pan map to user's initial coordinates
      _mapController.move(
        LatLng(position.latitude, position.longitude),
        14.0,
      );

      // Start listening to location updates
      _positionStreamSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen((Position newPosition) {
        if (mounted) {
          setState(() {
            _currentPosition = newPosition;
            // Update active SOS location dynamically if active
            if (_isSOSActive) {
              _sosLocation = LatLng(newPosition.latitude, newPosition.longitude);
            }
          });
        }
      });

    } catch (e) {
      setState(() {
        _isLoadingLocation = false;
        _statusMessage = "Error initializing GPS: ${e.toString()}";
      });
    }
  }

  // Center map on user location
  void _recenterOnUser() {
    if (_currentPosition != null) {
      _mapController.move(
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        14.5,
      );
    } else {
      // Fallback center: Delhi Connaught Place
      _mapController.move(const LatLng(28.6139, 77.2090), 13.5);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("GPS coordinates not available. Centered on base.")),
      );
    }
  }

  // Trigger SOS Beacon
  void _toggleSOS() {
    setState(() {
      if (_isSOSActive) {
        _isSOSActive = false;
        _sosLocation = null;
      } else {
        _isSOSActive = true;
        if (_currentPosition != null) {
          _sosLocation = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
          _mapController.move(_sosLocation!, 14.5);
        } else {
          // Fallback location for mock purposes
          _sosLocation = const LatLng(28.6139, 77.2090);
          _mapController.move(_sosLocation!, 14.5);
        }
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: _isSOSActive ? Colors.green[800] : const Color(0xFFDC2626),
        content: Text(
          _isSOSActive 
            ? "CRITICAL SOS DISTRESS BEACON BROADCASTED!" 
            : "SOS distress signal cancelled.",
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Current mapping coordinates
    final LatLng centerPoint = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : const LatLng(28.6139, 77.2090); // Default to DelhiCP

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shield, color: Color(0xFFDC2626), size: 24),
            SizedBox(width: 8),
            Text(
              'AAPADA RAKSHAK',
              style: TextStyle(letterSpacing: 1.2),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.blue),
            tooltip: "Retry location permission",
            onPressed: _initLocationServices,
          )
        ],
      ),
      body: Stack(
        children: [
          // MAP CANVAS
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: centerPoint,
              initialZoom: 13.5,
              maxZoom: 18.0,
              minZoom: 10.0,
              onTap: (_, __) {
                // Close HUD card when tapping empty map space
                setState(() {
                  _selectedEntity = null;
                });
              },
            ),
            children: [
              // Styled dark CartoDB tiles template
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.aapada_rakshak.flutter',
              ),
              
              // GEOGRAPHIC RADII OVERLAYS (Safe zones, distress radius)
              CircleLayer(
                circles: [
                  // Safe Zone 1 (Green)
                  CircleMarker(
                    point: const LatLng(28.6120, 77.2100),
                    radius: 400,
                    useRadiusInMeter: true,
                    color: Colors.green.withOpacity(0.12),
                    borderColor: Colors.green,
                    borderStrokeWidth: 1.5,
                  ),
                  // Safe Zone 2 (Green)
                  CircleMarker(
                    point: const LatLng(28.6280, 77.1950),
                    radius: 350,
                    useRadiusInMeter: true,
                    color: Colors.green.withOpacity(0.12),
                    borderColor: Colors.green,
                    borderStrokeWidth: 1.5,
                  ),
                  
                  // Active SOS distress hazard zone (Red circle overlay)
                  if (_isSOSActive && _sosLocation != null)
                    CircleMarker(
                      point: _sosLocation!,
                      radius: 600,
                      useRadiusInMeter: true,
                      color: Colors.red.withOpacity(0.15),
                      borderColor: Colors.red,
                      borderStrokeWidth: 2.0,
                    ),

                  // GPS accuracy tracker circle (Blue overlay)
                  if (_currentPosition != null)
                    CircleMarker(
                      point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                      radius: 200,
                      useRadiusInMeter: true,
                      color: Colors.blue.withOpacity(0.06),
                      borderColor: Colors.blue.withOpacity(0.3),
                      borderStrokeWidth: 1.0,
                    ),
                ],
              ),
              
              // MARKERS LAYER
              MarkerLayer(
                markers: [
                  // 1. User Position Dot
                  if (_currentPosition != null)
                    Marker(
                      point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                      width: 40,
                      height: 40,
                      child: AnimatedBuilder(
                        animation: _pulseAnimation,
                        builder: (context, child) {
                          return Center(
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: _pulseAnimation.value * 2,
                                  height: _pulseAnimation.value * 2,
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withOpacity(0.3),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Container(
                                  width: 14,
                                  height: 14,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Colors.blue,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),

                  // 2. Incident Pins (Red triangles)
                  ..._mockIncidents.map((inc) {
                    final lat = inc['lat'] as double;
                    final lng = inc['lng'] as double;
                    final isHigh = inc['severity'] == 'high';

                    return Marker(
                      point: LatLng(lat, lng),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedEntity = {
                              'type': 'incident',
                              ...inc
                            };
                          });
                        },
                        child: Icon(
                          Icons.warning_rounded,
                          color: isHigh ? Colors.red[600] : Colors.orange[600],
                          size: 26,
                        ),
                      ),
                    );
                  }),

                  // 3. Relief Camps (Blue cross/shelter circles)
                  ..._mockCamps.map((camp) {
                    final lat = camp['lat'] as double;
                    final lng = camp['lng'] as double;
                    final isFull = (camp['bedsOccupied'] / camp['beds']) >= 0.9;

                    return Marker(
                      point: LatLng(lat, lng),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedEntity = {
                              'type': 'camp',
                              ...camp
                            };
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: isFull ? Colors.orange[850] : Colors.blue[900],
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(
                            Icons.home_work_outlined,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // LOCATION LOADING SCREEN (Permission gating / GPS setup)
          if (_isLoadingLocation)
            Container(
              color: const Color(0xFF090D16).withOpacity(0.92),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: Colors.blue),
                    const SizedBox(height: 16),
                    Text(
                      _statusMessage ?? "Locating device position...",
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    )
                  ],
                ),
              ),
            ),

          // PERMISSION DENIED INTERSTITIAL
          if (!_isLoadingLocation && _permissionDenied)
            Container(
              color: const Color(0xFF090D16).withOpacity(0.96),
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_off_rounded, color: Colors.redAccent, size: 64),
                    const SizedBox(height: 16),
                    const Text(
                      "GPS Permissions Required",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _statusMessage ?? "App requires GPS location to coordinate emergency rescue dispatches.",
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B82F6),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.settings),
                      label: const Text("Enable Permissions"),
                      onPressed: () async {
                        await Geolocator.openAppSettings();
                        _initLocationServices();
                      },
                    )
                  ],
                ),
              ),
            ),

          // INSPECT HUD BOTTOM CARD (Inlined)
          if (_selectedEntity != null)
            Positioned(
              bottom: 110,
              left: 16,
              right: 16,
              child: Card(
                elevation: 8,
                shadowColor: Colors.black54,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: (_selectedEntity['type'] == 'camp') ? Colors.blue.withOpacity(0.4) : Colors.red.withOpacity(0.4),
                    width: 1.5,
                  ),
                ),
                color: const Color(0xFF0F172A),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                (_selectedEntity['type'] == 'camp') ? Icons.home_work : Icons.warning_amber_rounded,
                                color: (_selectedEntity['type'] == 'camp') ? Colors.blue[400] : Colors.red[400],
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                (_selectedEntity['type'] == 'camp') ? "RELIEF SHELTER HUD" : "CRITICAL HAZARD DETAILS",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: (_selectedEntity['type'] == 'camp') ? Colors.blue[400] : Colors.red[400],
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            icon: const Icon(Icons.close, size: 16, color: Colors.grey),
                            onPressed: () {
                              setState(() {
                                _selectedEntity = null;
                              });
                            },
                          )
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        (_selectedEntity['type'] == 'camp') ? _selectedEntity['name'] : _selectedEntity['title'],
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        (_selectedEntity['type'] == 'camp') 
                          ? "Coordinates: ${_selectedEntity['lat'].toStringAsFixed(4)}, ${_selectedEntity['lng'].toStringAsFixed(4)}"
                          : "Location: ${_selectedEntity['locationName']}",
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      if (_selectedEntity['type'] == 'camp') ...[
                        // Camp Supply HUD
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            CampSupplyIndicator(
                              icon: Icons.hotel,
                              label: "Beds",
                              value: "${_selectedEntity['bedsOccupied']}/${_selectedEntity['beds']}",
                              isLow: (_selectedEntity['bedsOccupied'] / _selectedEntity['beds']) >= 0.9,
                            ),
                            CampSupplyIndicator(
                              icon: Icons.fastfood,
                              label: "Food",
                              value: "${_selectedEntity['foodRations']}%",
                              isLow: (_selectedEntity['foodRations'] as int) < 35,
                            ),
                            CampSupplyIndicator(
                              icon: Icons.water_drop,
                              label: "Water",
                              value: "${_selectedEntity['waterSupply']}%",
                              isLow: (_selectedEntity['waterSupply'] as int) < 30,
                            ),
                          ],
                        )
                      ] else ...[
                        // Incident description details
                        Text(
                          _selectedEntity['details'] as String,
                          style: const TextStyle(fontSize: 13, color: Colors.blueGrey),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.red[950],
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: Colors.red[850]!, width: 1),
                              ),
                              child: Text(
                                "Severity: ${_selectedEntity['severity'].toString().toUpperCase()}",
                                style: TextStyle(fontSize: 10, color: Colors.red[300], fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        )
                      ]
                    ],
                  ),
                ),
              ),
            ),

          // FLOATING MAP CONTROL PANEL (Recenter FAB + SOS distress trigger)
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Real-time SOS Trigger Button (Red press toggle)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isSOSActive ? Colors.green[800] : const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        elevation: 6,
                        shadowColor: Colors.black45,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: Colors.white24, width: 1),
                        ),
                      ),
                      onPressed: _toggleSOS,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _isSOSActive ? Icons.check_circle : Icons.emergency_share,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _isSOSActive ? "SOS ACTIVE (TAP TO STANDBY)" : "TRIGGER SOS DISTRESS",
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                
                // Recenter GPS FAB
                FloatingActionButton(
                  heroTag: 'recenter_btn',
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: const Color(0xFF3B82F6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFF1E293B), width: 1.5),
                  ),
                  onPressed: _recenterOnUser,
                  child: const Icon(Icons.gps_fixed),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Dedicated camp supply tracking UI item
class CampSupplyIndicator extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isLow;

  const CampSupplyIndicator({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.isLow,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: isLow ? Colors.orange : Colors.grey, size: 18),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 12, 
            fontWeight: FontWeight.bold, 
            color: isLow ? Colors.orange : Colors.white,
          ),
        ),
      ],
    );
  }
}
