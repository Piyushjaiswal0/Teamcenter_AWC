#include <iostream>
#include <string>
using namespace std;

struct Node{
    int data;
    Node* next;
    
    Node(int value){
        data = value;
        next = nullptr;
    }
};

void add(Node*& head, int value){
    Node* newNode = new Node(value);
    
    if (head == nullptr){
        head = newNode;
        return;
    }
    
    Node* current = head;
    while (current->next != nullptr){
        current = current->next;
    }
    current->next = newNode;
}

void print(Node*head){
    Node* current = head;
    while (current != nullptr){
        cout << current->data << " ";
        current= current->next;
    }
}

int main() {
    Node* head = nullptr;

    // Append some values
    add(head, 10);
    add(head, 20);
    add(head, 30);


    print(head); // Output: 10 20 30
    return 0;
}