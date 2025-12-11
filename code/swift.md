#!/usr/bin/env swift

/**
  demo.swift

    This is a Swift script that demonstrates how to use the AudioShake API to separate music stems.
    
    
 Go here:
 https://www.swift.org/download/

 Download:
     • Swift 6.0.1 for macOS

 Install it, then run:
     swift --version
 
 You should see:
     Swift version 6.0.1 (swift-6.0.1-RELEASE)

 Run Instructions:
     swift demo.swift
 
 */

// ================================================
//  IMPORTS
// ================================================
import Foundation

// ================================================
//  CONFIG
// ================================================

// NOTE: API key is for demonstration only.
// injected key and payload by loadSwiftCodeMD
let apiKey = "${api_key}"
let payload: [String: Any] = ${payload}


// ================================================
//  MODELS
// ================================================
struct TaskResponse: Decodable {
    let id: String
    let targets: [Target]?

    struct Target: Decodable {
        let model: String
        let status: String
        let output: [Output]?

        struct Output: Decodable {
            let format: String
            let link: String
        }
    }
}

// ================================================
//  HELPERS
// ================================================
func downloadFile(from url: URL, saveAs filename: String) async throws {
    let (data, _) = try await URLSession.shared.data(from: url)
    try data.write(to: URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
                    .appendingPathComponent(filename))
    print("⬇️  Saved: \(filename)")
}

// ================================================
//  API CALLS
// ================================================
func createTask() async throws -> String {
    print("🚀 Creating task...")

    var request = URLRequest(url: URL(string: "https://api.audioshake.ai/tasks")!)
    request.httpMethod = "POST"
    request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: payload)

    let (data, _) = try await URLSession.shared.data(for: request)

    guard let decoded = try? JSONDecoder().decode(TaskResponse.self, from: data) else {
        print("Error parsing createTask response:", String(data: data, encoding: .utf8) ?? "")
        throw NSError(domain: "DecodeError", code: -1)
    }

    print("Created task: \(decoded.id)")
    return decoded.id
}


func pollTask(taskId: String) async throws -> [TaskResponse.Target] {
    var request = URLRequest(url: URL(string: "https://api.audioshake.ai/tasks/\(taskId)")!)
    request.setValue(apiKey, forHTTPHeaderField: "x-api-key")

    while true {
        let (data, _) = try await URLSession.shared.data(for: request)

        guard let response = try? JSONDecoder().decode(TaskResponse.self, from: data) else {
            print("Waiting for valid response...")
            try await Task.sleep(for: .seconds(2))
            continue
        }

        guard let targets = response.targets else {
            print("Waiting for targets...")
            try await Task.sleep(for: .seconds(2))
            continue
        }

        let allDone = targets.allSatisfy { $0.status == "completed" }

        if allDone {
            print("\n🎉 All stems completed.\n")
            return targets
        }

        print("⏳ Still processing...")
        try await Task.sleep(for: .seconds(2))
    }
}

// ================================================
//  TOP-LEVEL EXECUTION
// ================================================
Task {
    do {
        let taskID = try await createTask()
        let targets = try await pollTask(taskId: taskID)

        print("📥 Downloading stems...\n")

        for target in targets {
            for output in target.output ?? [] {
                guard let url = URL(string: output.link) else { continue }

                // Example: vocals.mp3
                let filename = "\(target.model).\(output.format)"

                try await downloadFile(from: url, saveAs: filename)
            }
        }

        print("\n✅ Done! All stems downloaded into:")
        print("   \(FileManager.default.currentDirectoryPath)\n")
        exit(EXIT_SUCCESS)

    } catch {
        print("❌ Error:", error)
        exit(EXIT_FAILURE)
    }
}

// Keep script alive while async runs
dispatchMain()
