import Combine
import Foundation
import OrderedCollections
import OrderedJSON

@MainActor
public final class DataModel: ObservableObject {
    private let dataSubject: CurrentValueSubject<JSONValue, Never>
    let pathChangeSubject = PassthroughSubject<String, Never>()
    var onReadPath: ((String) -> Void)?
    private var listeners: [String: [(id: UUID, callback: (JSONValue?) -> Void)]] = [:]

    public var data: JSONValue {
        dataSubject.value
    }

    public var dataPublisher: AnyPublisher<JSONValue, Never> {
        dataSubject.eraseToAnyPublisher()
    }

    public init(initial: JSONValue = .object([:])) {
        self.dataSubject = CurrentValueSubject(initial)
    }

    public func getThrowing(_ path: String) throws -> JSONValue? {
        let components = try JSONValue.parsePathThrowing(path)
        if let onReadPath {
            onReadPath(Self.buildPointer(components))
        }
        if components.isEmpty {
            return dataSubject.value
        }
        return dataSubject.value[components]
    }

    public func get(_ path: String) -> JSONValue? {
        try? getThrowing(path)
    }
}
