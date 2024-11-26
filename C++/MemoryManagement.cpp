#include <iostream>
using namespace std;

int main(){
    // Allocating memory for a single integer using new
    int *ptr = new int(10);

    cout << "Value of ptr : " << ptr << endl; // Prints the address of the allocated memory
    cout << "Value of *ptr : " << *ptr << endl; // Prints the value at the address, which is 10
    cout << "Value of &ptr : " << &ptr << endl; // Prints the address of the pointer itself (location of ptr variable)

    // Deallocating memory using delete
    delete ptr; 
    cout << "Value of *ptr after delete : " << *ptr << endl; // Undefined behavior, accessing deleted memory
    cout << "Value of ptr after delete : " << ptr << endl; // Prints the address, but it's now dangling

    // Allocating memory using malloc
    int *ptrMalloc = (int*)malloc(sizeof(int)); 
    cout << "Value of *ptrMalloc : " << *ptrMalloc << endl; // Undefined behavior, uninitialized memory
    cout << "Value of ptrMalloc : " << ptrMalloc << endl; // Prints the address

    *ptrMalloc = 20; // Assign value to the allocated memory
    cout << "Value of *ptrMalloc : " << *ptrMalloc << endl; // Prints the updated value (20)
    cout << "Value of &ptrMalloc : " << &ptrMalloc << endl; // Prints the address of the pointer
    cout << "Value of ptrMalloc : " << ptrMalloc << endl; // Prints the address

    // Freeing memory using free
    free(ptrMalloc);
    cout << "Value of *ptrMalloc : " << *ptrMalloc << endl; // Undefined behavior, accessing freed memory
    cout << "Value of ptrMalloc : " << ptrMalloc << endl; // Prints the freed memory address, it is now dangling
}