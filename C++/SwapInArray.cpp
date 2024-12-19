#include <iostream>
#include <string>

using namespace std;

int main() {
    
    int arr[] = {1,2,8,3,5,4};
    
    int large = arr[0], second = 0;
    
    int largeIndex =0, smallIndex=0;
    int size = sizeof(arr)/sizeof(arr[0]);
    for(int i=0; i<size; i++){
        if(large < arr[i] && large != arr[i]){
            large = arr[i];
            largeIndex = i;
        }
        else if(second < arr[i]){
            second = arr[i];
            smallIndex = i;
        }
    }
    
    arr[smallIndex] = large;
    arr[largeIndex] = second;
    
    for(int i =0; i<size; i++){
        cout << arr[i]<< " ";
    }
    return 0;
}