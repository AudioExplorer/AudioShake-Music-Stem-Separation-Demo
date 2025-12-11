/**
 
 ContentView.swift
 AudioShake Music Separation Demo
 Developed for AudioShake by Dan Zeitman on 12/9/25.

    Requires iOS 17.0 or later.
    This demo uses modern SwiftUI and Swift concurrency features that are only fully supported on iOS 17+.
    
    Instructions:
    Create a new XCode project for IOS and replace the ContentView with this code.
    List tasks, tap on the TaskID to update the TaskID textfield for get task by ID

    NOTE: The API key shown here is provided solely for demonstration.
    For any production deployment, you should implement a secure authentication flow and avoid hard-coding API keys in client or frontend code.

*/


import Foundation
import SwiftUI
import AVFoundation
import Combine


nonisolated struct TaskResponse: Decodable {
    let id: String
    let createdAt: String?
    let updatedAt: String?
    let clientId: String?
    let targets: [Target]

    struct Target: Decodable {
        let id: String
        let createdAt: String?
        let updatedAt: String?
        let url: String?
        let model: String
        let taskId: String?
        let status: String
        let formats: [String]?
        let output: [Output]
        let cost: Double?
        let error: String?
        let duration: Double?
        let variant: String?
        let residual: Bool?
        let language: String?

        struct Output: Decodable {
            let name: String
            let format: String
            let type: String
            let link: String
        }
    }
}


struct ContentView: View {
    
    @State private var taskID: String = ""
    @State private var taskResponse: TaskResponse?
    @State private var taskList: [TaskResponse] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let client = AudioShakeClient()
    
    var body: some View {
        VStack(spacing: 16) {
            
            Button("List Tasks") {
                Task { await listTasks() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            
            // MARK: - Task Input
            HStack {
                TextField("Enter Task ID", text: $taskID)
                    .textFieldStyle(.roundedBorder)
                
                Button("Get Task") {
                    Task { await getTask(taskID) }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
            }
            .padding(.horizontal)
            
            // MARK: - Create Task
            Button("Create Task") {
                Task { await createTask() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            
            // MARK: - Errors
            if let err = errorMessage {
                Text(err)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding(.top, 4)
            }

            // MARK: - Task Result List (bottom)
            Group {
                // If multiple tasks are loaded (listTasks)
                if !taskList.isEmpty {
                    List {
                        ForEach(taskList, id: \.id) { task in
                            StemsPlayer(task: task, onSelectTaskID: { id in
                                self.taskID = id
                            })
                        }
                    }
                    // If a single task is loaded (getTask)
                } else if let task = taskResponse {
                    StemsPlayer(task: task, onSelectTaskID: { id in
                        self.taskID = id
                    })
                } else {
                    Text("No Task Loaded")
                        .foregroundStyle(.gray)
                        .padding(.bottom)
                }
            }
//            .frame(height: 260)
        }
        .padding(.top)
    }
    
    
 
    
    
    // MARK: UI Helper
    func getFilenameFromURL(url: String) -> String {
        let fileName = URL(string: url)?.lastPathComponent ?? "unknown"
        let base = fileName.split(separator: "?").first ?? "unknown"
        return String(base)
    }
    
    // MARK: - API Calls
    func listTasks() async {
        isLoading = true
        errorMessage = nil

        do {
            let tasks = try await client.listTasks()
            await MainActor.run {
                self.taskList = tasks       // ← store list
                self.taskResponse = nil     // ← clear single task UI
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to fetch tasks: \(error.localizedDescription)"
            }
        }

        isLoading = false
    }
    
    func getTask(_ id: String) async {
        isLoading = true
        errorMessage = nil
        
        
        do {
            let task = try await client.getTask(id: id)
            
            print(task.targets[0].output)
            self.taskList = []
            self.taskResponse = task
            await MainActor.run {
                self.taskResponse = task
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to fetch task: \(error.localizedDescription)"
            }
        }
        
        isLoading = false
    }
    
    
    func createTask() async {
        isLoading = true
        errorMessage = nil

        do {
            let task = try await client.createTask()

            await MainActor.run {
                self.taskList = []          // <-- CRITICAL
                self.taskResponse = task    // show StemsPlayer immediately
                self.taskID = task.id
            }

            Task {
                await pollUntilComplete(taskID: task.id)
            }

        } catch {
            await MainActor.run {
                self.errorMessage = "Create failed: \(error.localizedDescription)"
            }
        }

        isLoading = false
    }
    

    
    func pollUntilComplete(taskID: String) async {
        while true {
            try? await Task.sleep(for: .seconds(5))
            
            do {
                let current = try await client.getTask(id: taskID)
                
                await MainActor.run {
                    self.taskResponse = current
                }
                
                if current.targets.allSatisfy({ $0.status == "completed" }) {
                    print("🎉 Task Complete")
                    return
                }
                
            } catch {
                await MainActor.run {
                    self.errorMessage = "Polling error: \(error.localizedDescription)"
                }
                return
            }
        }
    }
}

actor AudioShakeClient {
    // Injected apiKey
    private let apiKey = "${api_key}"
    private let baseURL = "https://api.audioshake.ai"

    // MARK: - Generic Request Builder
    private func makeRequest(
        path: String,
        method: String = "GET",
        body: Data? = nil
    ) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        return request
    }

    // MARK: - Create Task
    func createTask() async throws -> TaskResponse {
        // Injected payload
        let payload: [String: Any] = ${payload}
            

        let jsonData = try JSONSerialization.data(withJSONObject: payload)

        let request = try makeRequest(
            path: "/tasks",
            method: "POST",
            body: jsonData
        )

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }

    // MARK: - Get Task by ID
    func getTask(id: String) async throws -> TaskResponse {
        let request = try makeRequest(path: "/tasks/\(id)")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }

    // MARK: - List Tasks
    func listTasks() async throws -> [TaskResponse] {
        let request = try makeRequest(path: "/tasks")

        let (data, _) = try await URLSession.shared.data(for: request)

        // decode array directly
        return try JSONDecoder().decode([TaskResponse].self, from: data)
    }
    
   
}
struct StemsPlayer: View {

    let task: TaskResponse
    let onSelectTaskID: (String) -> Void
    @State private var showingShare = false
    @State private var shareURL: URL?

    @StateObject private var sync: StemSyncController

    init(task: TaskResponse, onSelectTaskID: @escaping (String) -> Void) {
        self.task = task
        self.onSelectTaskID = onSelectTaskID

        // Count ALL outputs across ALL targets
        let totalOutputs = task.targets.flatMap { $0.output }.count

        // Initialize mute/solo arrays to match number of players
        let initial = Array(repeating: false, count: totalOutputs)

        _sync = StateObject(wrappedValue: StemSyncController(initialMuteStates: initial))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            
            let allCompleted = task.targets.allSatisfy { $0.status == "completed" }
            let playersReady = sync.players.count == task.targets.flatMap(\.output).count
            let canPlay = allCompleted && playersReady
            
            // GLOBAL PLAY / STOP
            HStack(spacing: 12) {
                Button(action: toggleGlobalPlay) {
                    Image(systemName: sync.isPlaying ? "stop.fill" : "play.fill")
                        .font(.title)
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canPlay)
                .opacity(canPlay ? 1.0 : 0.4)

                Text("Play All Stems")
                    .font(.headline)
            }
            Button {
                onSelectTaskID(task.id)
            } label: {
                Text("Task \(task.id)")
                    .font(.headline)
                    .foregroundColor(.secondary)
            }
            
            Divider()

            // ---- NOT A LIST ----
            ScrollView {
                VStack(spacing: 20) {
                    ForEach(task.targets.indices, id: \.self) { index in
                        let target = task.targets[index]

                        VStack(alignment: .leading, spacing: 8) {

                            Text(target.model.capitalized)
                                .font(.headline)

                            // show progress if not complete
                            if target.status != "completed" {
                                HStack(spacing: 6) {
                                    ProgressView()
                                        .scaleEffect(0.6)
                                    Text("Status: \(target.status)")
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                }
                            }
                            ForEach(Array(target.output.enumerated()), id: \.1.link) { (outputIndex, output) in
                                let playerIndex = outputGlobalIndex(targetIndex: index, outputIndex: outputIndex)

                                StemOutputRow(
                                    playerIndex: playerIndex,
                                    output: output,
                                    sync: sync,
                                    onShare: { url in
                                        shareURL = url
                                        showingShare = true
                                    }
                                )
                            }

                            Divider()
                        }
                    }
                }
            }

        }
        .padding()
        .onAppear {
            if sync.players.isEmpty,
               task.targets.allSatisfy({ $0.status == "completed" }) {
                loadPlayers()
            }
        }
        .onChange(of: task.targets.flatMap(\.output).count) { _, newCount in
            if newCount != sync.muteStates.count {
                sync.muteStates = Array(repeating: false, count: newCount)
                sync.soloStates = Array(repeating: false, count: newCount)
                loadPlayers()
            }
        }
//        .onChange(of: task.targets.map { $0.status }) {
//            if sync.players.isEmpty,
//               task.targets.allSatisfy({ $0.status == "completed" }) {
//                loadPlayers()
//            }
//        }
        .sheet(isPresented: $showingShare) {
            if let url = shareURL {
                ShareSheet(items: [url])
            }
        }
        
       
    }
    private func outputGlobalIndex(targetIndex: Int, outputIndex: Int) -> Int {
        let precedingOutputCount = task.targets[..<targetIndex].flatMap { $0.output }.count
        return precedingOutputCount + outputIndex
    }
    private func loadPlayers() {
        let urls: [URL] = task.targets
            .flatMap { $0.output }
            .compactMap { URL(string: $0.link) }

        sync.load(urls: urls)
    }

    private func toggleGlobalPlay() {
        sync.isPlaying ? sync.stopAll() : sync.playAll()
    }
}

struct StemOutputRow: View {
    let playerIndex: Int
    let output: TaskResponse.Target.Output
    @ObservedObject var sync: StemSyncController
    let onShare: (URL) -> Void

    var body: some View {
        HStack(spacing: 16) {

            // Mute
            // Mute
            Button {
                guard playerIndex < sync.muteStates.count else { return }
                sync.toggleMute(playerIndex)
                sync.updateVolumes()
            } label: {
                Text("M")
                    .font(.headline)
                    .frame(width: 28, height: 28)
                    .background(
                        playerIndex < sync.muteStates.count
                            ? (sync.muteStates[playerIndex] ? Color.yellow : Color.gray.opacity(0.3))
                            : Color.gray.opacity(0.3)
                    )
                    .clipShape(Circle())
            }
 
            // Solo
            Button {
                guard playerIndex < sync.soloStates.count else { return }
                sync.toggleSolo(playerIndex)
                sync.updateVolumes()
            } label: {
                Text("S")
                    .font(.headline)
                    .frame(width: 28, height: 28)
                    .background(
                        playerIndex < sync.soloStates.count
                            ? (sync.soloStates[playerIndex] ? Color.green : Color.gray.opacity(0.3))
                            : Color.gray.opacity(0.3)
                    )
                    .clipShape(Circle())
            }
            // Share
            if let url = URL(string: output.link) {
                Button { onShare(url) } label: {
                    Image(systemName: "square.and.arrow.down")
                        .font(.title3)
                }
            }

            Image(systemName: "waveform")
                .foregroundStyle(.gray)

            Text(output.name)
                .font(.caption)
                .lineLimit(1)

            Spacer()
        }
        .buttonStyle(.plain)
        .contentShape(Rectangle())
        .padding(.vertical, 6)
    }
}
//sharesheet
    struct ShareSheet: UIViewControllerRepresentable {
        let items: [Any]

        func makeUIViewController(context: Context) -> UIActivityViewController {
            UIActivityViewController(activityItems: items, applicationActivities: nil)
        }

        func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
    }

// Model
    class StemSyncController: ObservableObject {
        @Published var players: [AVAudioPlayer] = []
        @Published var isPlaying = false
        @Published var muteStates: [Bool]
        @Published var soloStates: [Bool]

        init(initialMuteStates: [Bool] = []) {
            self.muteStates = initialMuteStates
            self.soloStates = Array(repeating: false, count: initialMuteStates.count)
        }
        
        @MainActor
        func load(urls: [URL]) {
            Task.detached {
                // load data off main actor
                let audioData = await urls.asyncMap { url -> Data? in
                    try? await URLSession.shared.data(from: url).0
                }
                await MainActor.run {
                    var newPlayers: [AVAudioPlayer] = []
                    for data in audioData.compactMap({ $0 }) {
                        if let p = try? AVAudioPlayer(data: data) {
                            p.prepareToPlay()
                            newPlayers.append(p)
                        }
                    }
                    self.players = newPlayers
                }
            }
        }


        // MARK: - Mute Logic

        func toggleMute(_ index: Int) {

            // If ANY solos exist, mute affects only that soloed track
            if soloStates.contains(true) {
                muteStates[index].toggle()
                updateVolumes()
                return
            }

            // Normal mute toggling when no solos exist
            muteStates[index].toggle()
            updateVolumes()
        }

        // MARK: - Solo Logic

        func toggleSolo(_ index: Int) {
            soloStates[index].toggle()

            // If solo is activated, it MUST unmute the track (DAW rule)
            if soloStates[index] == true {
                muteStates[index] = false
            }

            updateVolumes()
        }

        // MARK: - Playback

        func playAll() {
            guard !players.isEmpty else { return }
            isPlaying = true

            let startTime = players.first!.deviceCurrentTime + 0.05

            for player in players {
                player.currentTime = 0
                player.play(atTime: startTime)
            }

            updateVolumes()  // apply initial mute/solo state
        }

        func stopAll() {
            players.forEach { $0.stop() }
            isPlaying = false
        }

        // MARK: - Core Volume Logic (DAW Accurate)

        func updateVolumes() {
            let solosActive = soloStates.contains(true)

            for (i, player) in players.enumerated() {

                // CASE A — Solos exist
                if solosActive {
                    if soloStates[i] {
                        // Soloed track → normal or muted
                        player.volume = muteStates[i] ? 0 : 1
                    } else {
                        // Not soloed → forced mute
                        player.volume = 0
                    }
                    continue
                }

                // CASE B — No solos → normal mute rules
                player.volume = muteStates[i] ? 0 : 1
            }
        }
    }


extension Array {
    func asyncMap<T>(_ transform: @escaping (Element) async throws -> T) async rethrows -> [T] {
        var results: [T] = []
        results.reserveCapacity(self.count)

        for element in self {
            let value = try await transform(element)
            results.append(value)
        }

        return results
    }
}

#Preview {
    Group {
        ContentView()
    }
}



